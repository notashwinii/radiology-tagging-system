from datetime import datetime

from pydantic import BaseModel, EmailStr


class RegistrationResponse(BaseModel):
    email: EmailStr
    verification_required: bool
    verification_email_sent: bool
    message: str


class VerificationResendRequest(BaseModel):
    email: EmailStr


class VerificationResendResponse(BaseModel):
    email: EmailStr
    verification_email_sent: bool
    message: str


class VerificationCompleteResponse(BaseModel):
    email: EmailStr
    verified: bool
    message: str
    verified_at: datetime
