# fastapi 
from fastapi import APIRouter, Depends, HTTPException, Query, status, Form
from typing import Annotated
from datetime import timedelta

# sqlalchemy
from sqlalchemy.orm import Session

# import
from app.schemas.auth import VerificationCompleteResponse, VerificationResendRequest, VerificationResendResponse
from app.schemas.user import User, UserLogin, Token
from app.core.dependencies import get_db
from app.core.settings import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from app.api.endpoints.user import functions as user_functions


auth_module = APIRouter()

# ============> login/logout < ======================
# getting access token for login 
@auth_module.post("/login", response_model= Token)
async def login_for_access_token(
    user: UserLogin,
    db: Session = Depends(get_db)
) -> Token:
    member = user_functions.authenticate_user(db, user=user)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_functions.ensure_user_is_verified(member)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = user_functions.create_access_token(
        data={"id": member.id, "email": member.email, "role": member.role.value}, expires_delta=access_token_expires
    )

    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = await user_functions.create_refresh_token(
        data={"id": member.id, "email": member.email, "role": member.role.value}, 
        expires_delta=refresh_token_expires
    )
    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

@auth_module.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_token: str = Form(...),
    db: Session = Depends(get_db)
):
    token = await user_functions.refresh_access_token(db, refresh_token)
    return token

# get curren user 
@auth_module.get('/users/me/', response_model= User)
async def read_current_user( current_user: Annotated[User, Depends(user_functions.get_current_user)]):
    return current_user


@auth_module.post("/auth/verify-email/resend", response_model=VerificationResendResponse)
async def resend_verification_email(
    payload: VerificationResendRequest,
    db: Session = Depends(get_db),
):
    return user_functions.resend_verification_email_for_user(db, payload.email)


@auth_module.get("/auth/verify-email", response_model=VerificationCompleteResponse)
async def verify_email(
    token: str = Query(..., min_length=20),
    db: Session = Depends(get_db),
):
    return user_functions.verify_user_email(db, token)
