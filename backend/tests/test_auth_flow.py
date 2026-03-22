from app.api.endpoints.user import functions as user_functions
from app.models import User
from tests.conftest import TestingSessionLocal  # type: ignore


def test_signup_requires_verification(client):
    resp = client.post(
        "/users/",
        json={"email": "user@example.com", "password": "strongpassword123", "first_name": "Test", "last_name": "User"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verification_required"] is True
    assert data["email"] == "user@example.com"


def test_unverified_login_blocked_then_verification_allows_login(client):
    # Create user
    client.post(
        "/users/",
        json={"email": "login@example.com", "password": "strongpassword123", "first_name": "Login", "last_name": "User"},
    )

    # Attempt login (should be forbidden)
    denied = client.post("/login", json={"email": "login@example.com", "password": "strongpassword123"})
    assert denied.status_code == 403
    assert denied.json()["detail"]["code"] == "email_not_verified"

    db = TestingSessionLocal()
    try:
        user = db.query(User).filter_by(email="login@example.com").first()
        raw_token = user_functions.create_verification_token(db, user.id)
    finally:
        db.close()

    verified = client.get(f"/auth/verify-email?token={raw_token}")
    assert verified.status_code == 200
    assert verified.json()["verified"] is True

    # Login should now succeed
    ok = client.post("/login", json={"email": "login@example.com", "password": "strongpassword123"})
    assert ok.status_code == 200
    tokens = ok.json()
    assert "access_token" in tokens
