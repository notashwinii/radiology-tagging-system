import logging
from pathlib import Path
from typing import List

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # Database
    db_host: str = Field(..., alias="DB_HOST")
    db_port: int = Field(..., alias="DB_PORT")
    db_name: str = Field(..., alias="DB_NAME")
    db_user: str = Field(..., alias="DB_USER")
    db_password: str = Field(..., alias="DB_PASSWORD")

    # Auth / JWT
    secret_key: str = Field(..., alias="SECRET_KEY")
    refresh_secret_key: str = Field(..., alias="REFRESH_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    # CORS / URLs
    frontend_url: str = Field(..., alias="FRONTEND_URL")
    app_base_url: str = Field(..., alias="APP_BASE_URL")
    backend_cors_origins: str = Field("", alias="BACKEND_CORS_ORIGINS")

    # Orthanc
    orthanc_url: str = Field(..., alias="ORTHANC_URL")
    orthanc_username: str = Field(..., alias="ORTHANC_USERNAME")
    orthanc_password: str = Field(..., alias="ORTHANC_PASSWORD")

    # SMTP / Email verification
    smtp_host: str = Field(..., alias="SMTP_HOST")
    smtp_port: int = Field(..., alias="SMTP_PORT")
    smtp_username: str = Field(..., alias="SMTP_USERNAME")
    smtp_password: str = Field(..., alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(True, alias="SMTP_USE_TLS")
    email_from: str = Field(..., alias="EMAIL_FROM")
    verification_token_expire_hours: int = Field(24, alias="VERIFICATION_TOKEN_EXPIRE_HOURS")
    verification_resend_cooldown_seconds: int = Field(60, alias="VERIFICATION_RESEND_COOLDOWN_SECONDS")

    @property
    def database_url(self) -> str:
        return PostgresDsn.build(
            scheme="postgresql",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=str(self.db_port),
            path=f"/{self.db_name}",
        ).unicode_string()

    @property
    def cors_origins(self) -> List[str]:
        configured = self.backend_cors_origins or self.frontend_url
        origins: List[str] = []
        for origin in configured.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
        return origins


settings = Settings()

# Backward-compatible module-level constants
DATABASE_URL = settings.database_url
SECRET_KEY = settings.secret_key
REFRESH_SECRET_KEY = settings.refresh_secret_key
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days
FRONTEND_URL = settings.frontend_url
APP_BASE_URL = settings.app_base_url
BACKEND_CORS_ORIGINS = settings.cors_origins
ORTHANC_URL = settings.orthanc_url
ORTHANC_USERNAME = settings.orthanc_username
ORTHANC_PASSWORD = settings.orthanc_password
SMTP_HOST = settings.smtp_host
SMTP_PORT = settings.smtp_port
SMTP_USERNAME = settings.smtp_username
SMTP_PASSWORD = settings.smtp_password
SMTP_USE_TLS = settings.smtp_use_tls
EMAIL_FROM = settings.email_from
VERIFICATION_TOKEN_EXPIRE_HOURS = settings.verification_token_expire_hours
VERIFICATION_RESEND_COOLDOWN_SECONDS = settings.verification_resend_cooldown_seconds


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
