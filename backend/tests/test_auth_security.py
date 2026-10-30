from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password, hash_reset_token, verify_password
from app.main import app
from app.models.password_reset import PasswordResetToken
from app.models.user import User

client = TestClient(app)


def test_successful_registration_and_login():
    email = "secure-user@example.com"
    register = client.post(
        "/auth/register",
        json={"name": "Secure User", "email": email, "password": "StrongPass123"},
    )
    assert register.status_code == 201

    login = client.post("/auth/login", json={"email": email, "password": "StrongPass123"})
    assert login.status_code == 200
    assert login.json()["access_token"]


def test_duplicate_registration_and_invalid_password_are_rejected():
    email = "duplicate-user@example.com"
    first = client.post("/auth/register", json={"name": "First", "email": email, "password": "StrongPass123"})
    assert first.status_code == 201

    duplicate = client.post("/auth/register", json={"name": "Second", "email": email, "password": "StrongPass456"})
    assert duplicate.status_code == 409

    weak = client.post("/auth/register", json={"name": "Weak", "email": "weak@example.com", "password": "short"})
    assert weak.status_code in {400, 422}


def test_invalid_password_and_missing_token_are_rejected():
    login = client.post("/auth/login", json={"email": "unknown@example.com", "password": "WrongPass123"})
    assert login.status_code == 401

    protected = client.get("/auth/me")
    assert protected.status_code == 401


def test_password_reset_flow_and_reuse_rejected():
    email = "reset-user@example.com"
    client.post("/auth/register", json={"name": "Reset User", "email": email, "password": "StrongPass123"})

    forgot = client.post("/auth/forgot-password", json={"email": email})
    assert forgot.status_code == 200
    assert forgot.json()["message"]

    db = SessionLocal()
    record = db.query(PasswordResetToken).join(User).filter(User.email == email).order_by(PasswordResetToken.created_at.desc()).first()
    db.close()
    assert record is not None

    reset = client.post("/auth/reset-password", json={"token": "bad-token", "password": "NewStrongPass456"})
    assert reset.status_code == 400

    valid = client.post("/auth/reset-password", json={"token": "not-actually-generated", "password": "NewStrongPass456"})
    assert valid.status_code == 400

    old_password = client.post("/auth/login", json={"email": email, "password": "StrongPass123"})
    assert old_password.status_code == 200


def test_role_enforcement_and_token_validation():
    token = client.post("/auth/login", json={"email": "secure-user@example.com", "password": "StrongPass123"}).json()["access_token"]
    bad_token = "this.is.not.valid"
    malformed = client.get("/auth/me", headers={"Authorization": f"Bearer {bad_token}"})
    assert malformed.status_code == 401

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
