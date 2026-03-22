import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, oauth2_scheme
from app.core.settings import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_SECRET_KEY,
    SECRET_KEY,
    VERIFICATION_RESEND_COOLDOWN_SECONDS,
    VERIFICATION_TOKEN_EXPIRE_HOURS,
)
from app.models import user as UserModel
from app.models.verification_token import VerificationToken
from app.schemas.auth import (
    RegistrationResponse,
    VerificationCompleteResponse,
    VerificationResendResponse,
)
from app.schemas.user import Token, UserCreate, UserLogin, UserUpdate
from app.services.email import EmailDeliveryError, send_verification_email

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
EMAIL_VERIFICATION_PURPOSE = "email_verification"


def build_error_detail(code: str, message: str, **extra):
    return {"code": code, "message": message, **extra}


def get_user_by_email(db: Session, email: str):
    return db.query(UserModel.User).filter(UserModel.User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    db_user = db.query(UserModel.User).filter(UserModel.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_verification_token(db: Session, user_id: int) -> str:
    now = datetime.now(timezone.utc)
    db.query(VerificationToken).filter(
        VerificationToken.user_id == user_id,
        VerificationToken.purpose == EMAIL_VERIFICATION_PURPOSE,
        VerificationToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)

    raw_token = secrets.token_urlsafe(48)
    db.add(
        VerificationToken(
            user_id=user_id,
            token_hash=hash_verification_token(raw_token),
            purpose=EMAIL_VERIFICATION_PURPOSE,
            expires_at=now + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS),
        )
    )
    db.commit()
    return raw_token


def create_new_user(db: Session, user: UserCreate) -> RegistrationResponse:
    hashed_password = pwd_context.hash(user.password)
    new_user = UserModel.User(
        email=user.email,
        password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        is_email_verified=False,
        email_verified_at=None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    verification_token = create_verification_token(db, new_user.id)
    verification_email_sent = True
    try:
        send_verification_email(new_user.email, verification_token)
    except EmailDeliveryError:
        verification_email_sent = False

    return RegistrationResponse(
        email=new_user.email,
        verification_required=True,
        verification_email_sent=verification_email_sent,
        message=(
            "Account created. Check your inbox to verify your email."
            if verification_email_sent
            else "Account created, but we could not send the verification email automatically. Request a resend to continue."
        ),
    )


def read_all_user(db: Session, skip: int, limit: int):
    return db.query(UserModel.User).offset(skip).limit(limit).all()


def update_user(db: Session, user_id: int, user: UserUpdate):
    db_user = get_user_by_id(db, user_id)
    updated_data = user.model_dump(exclude_unset=True)
    for key, value in updated_data.items():
        setattr(db_user, key, value)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = get_user_by_id(db, user_id)
    db.delete(db_user)
    db.commit()
    return {"msg": f"{db_user.email} deleted successfully"}


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def authenticate_user(db: Session, user: UserLogin):
    member = get_user_by_email(db, user.email)
    if not member:
        return False
    if not verify_password(user.password, member.password):
        return False
    return member


def ensure_user_is_verified(member: UserModel.User) -> None:
    if member.is_email_verified:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=build_error_detail(
            "email_not_verified",
            "Please verify your email before signing in.",
            email=member.email,
        ),
    )


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def create_refresh_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def refresh_access_token(db: Session, refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        member = get_user_by_id(db, user_id)
        if member is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"id": member.id, "email": member.email, "role": member.role.value},
            expires_delta=access_token_expires,
        )
        return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


def resend_verification_email_for_user(db: Session, email: str) -> VerificationResendResponse:
    generic_message = "If an unverified account exists for that email, a verification link has been sent."
    member = get_user_by_email(db, email)

    if not member or member.is_email_verified:
        return VerificationResendResponse(
            email=email,
            verification_email_sent=True,
            message=generic_message,
        )

    latest_token = (
        db.query(VerificationToken)
        .filter(
            VerificationToken.user_id == member.id,
            VerificationToken.purpose == EMAIL_VERIFICATION_PURPOSE,
            VerificationToken.used_at.is_(None),
        )
        .order_by(VerificationToken.created_at.desc())
        .first()
    )

    if latest_token and latest_token.created_at:
        created_at = latest_token.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        elapsed_seconds = (datetime.now(timezone.utc) - created_at).total_seconds()
        if elapsed_seconds < VERIFICATION_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=build_error_detail(
                    "verification_resend_rate_limited",
                    "Please wait before requesting another verification email.",
                    email=email,
                    retry_after_seconds=int(VERIFICATION_RESEND_COOLDOWN_SECONDS - elapsed_seconds),
                ),
            )

    verification_token = create_verification_token(db, member.id)
    send_verification_email(member.email, verification_token)

    return VerificationResendResponse(
        email=member.email,
        verification_email_sent=True,
        message="Verification email sent. Check your inbox for the new link.",
    )


def verify_user_email(db: Session, token: str) -> VerificationCompleteResponse:
    now = datetime.now(timezone.utc)
    verification_token = (
        db.query(VerificationToken)
        .filter(
            VerificationToken.token_hash == hash_verification_token(token),
            VerificationToken.purpose == EMAIL_VERIFICATION_PURPOSE,
        )
        .first()
    )

    if not verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=build_error_detail(
                "invalid_verification_token",
                "That verification link is invalid.",
            ),
        )

    if verification_token.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=build_error_detail(
                "verification_token_used",
                "That verification link has already been used.",
            ),
        )

    expires_at = verification_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=build_error_detail(
                "verification_token_expired",
                "That verification link has expired. Request a new email to continue.",
            ),
        )

    member = get_user_by_id(db, verification_token.user_id)
    member.is_email_verified = True
    member.email_verified_at = now
    verification_token.used_at = now

    db.query(VerificationToken).filter(
        VerificationToken.user_id == member.id,
        VerificationToken.purpose == EMAIL_VERIFICATION_PURPOSE,
        VerificationToken.used_at.is_(None),
        VerificationToken.id != verification_token.id,
    ).update({"used_at": now}, synchronize_session=False)

    db.add(member)
    db.add(verification_token)
    db.commit()
    db.refresh(member)

    return VerificationCompleteResponse(
        email=member.email,
        verified=True,
        verified_at=member.email_verified_at,
        message="Your email has been verified. You can now sign in.",
    )


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Annotated[Session, Depends(get_db)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        current_email: str = payload.get("email")
        if current_email is None:
            raise credentials_exception
        user = get_user_by_email(db, current_email)
        if user is None:
            raise credentials_exception
        return user
    except JWTError:
        raise credentials_exception
