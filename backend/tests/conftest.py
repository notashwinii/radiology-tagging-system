import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "test_db")
os.environ.setdefault("DB_USER", "test_user")
os.environ.setdefault("DB_PASSWORD", "test_password")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("REFRESH_SECRET_KEY", "test-refresh-secret-key")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("APP_BASE_URL", "http://localhost:3000")
os.environ.setdefault("BACKEND_CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("ORTHANC_URL", "http://localhost:8042")
os.environ.setdefault("ORTHANC_USERNAME", "orthanc")
os.environ.setdefault("ORTHANC_PASSWORD", "orthanc")
os.environ.setdefault("SMTP_HOST", "localhost")
os.environ.setdefault("SMTP_PORT", "25")
os.environ.setdefault("SMTP_USERNAME", "user")
os.environ.setdefault("SMTP_PASSWORD", "pass")
os.environ.setdefault("SMTP_USE_TLS", "false")
os.environ.setdefault("EMAIL_FROM", "noreply@example.com")
os.environ.setdefault("VERIFICATION_TOKEN_EXPIRE_HOURS", "24")
os.environ.setdefault("VERIFICATION_RESEND_COOLDOWN_SECONDS", "1")

from app.main import app  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.core.dependencies import get_db  # noqa: E402
from app.services import email as email_service  # noqa: E402
from app.api.endpoints.user import functions as user_functions  # noqa: E402


TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables once for the in-memory DB
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def override_dependencies(monkeypatch):
    # Replace DB dependency
    app.dependency_overrides[get_db] = override_get_db
    # Stub email sending
    monkeypatch.setattr(email_service, "send_verification_email", lambda recipient_email, token: None)
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PROJECT_ROOT.parent
for p in (PROJECT_ROOT, REPO_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))
