"""
Tests for authentication endpoints.
Covers: register, login, refresh, /me, Google OAuth stub.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import create_user_and_token, auth_headers

pytestmark = pytest.mark.asyncio


# ─── Registration ─────────────────────────────────────────────────────────────

async def test_register_success(client: AsyncClient):
    """Test 1: Successful user registration."""
    resp = await client.post("/api/v1/auth/register", json={
        "name": "Alice",
        "email": "alice@test.com",
        "password": "Password123!",
        "role": "learner",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "alice@test.com"
    assert data["role"] == "learner"
    assert "id" in data
    assert "hashed_password" not in data


async def test_register_duplicate_email(client: AsyncClient):
    """Test 2: Duplicate email is rejected with 409."""
    payload = {"name": "Bob", "email": "bob@test.com", "password": "Pass1234!", "role": "learner"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


async def test_register_invalid_role(client: AsyncClient):
    """Test 3: Registering as administrator is rejected."""
    resp = await client.post("/api/v1/auth/register", json={
        "name": "Evil Admin",
        "email": "evil@test.com",
        "password": "Pass1234!",
        "role": "administrator",
    })
    assert resp.status_code == 400


# ─── Login ────────────────────────────────────────────────────────────────────

async def test_login_success(client: AsyncClient):
    """Test 4: Successful login returns access + refresh tokens."""
    await client.post("/api/v1/auth/register", json={
        "name": "Carol", "email": "carol@test.com", "password": "Pass1234!", "role": "learner"
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "carol@test.com", "password": "Pass1234!"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient):
    """Test 5: Wrong password returns 401."""
    await client.post("/api/v1/auth/register", json={
        "name": "Dave", "email": "dave@test.com", "password": "Pass1234!", "role": "learner"
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "dave@test.com", "password": "wrongpassword"
    })
    assert resp.status_code == 401


async def test_login_nonexistent_user(client: AsyncClient):
    """Test 6: Login with unknown email returns 401."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com", "password": "Pass1234!"
    })
    assert resp.status_code == 401


# ─── Token Refresh ────────────────────────────────────────────────────────────

async def test_refresh_token(client: AsyncClient):
    """Test 7: Valid refresh token yields new access token."""
    _, token = await create_user_and_token(
        client, "eve@test.com", "Pass1234!", "Eve", "learner"
    )
    # Get refresh token
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "eve@test.com", "password": "Pass1234!"
    })
    refresh_token = login_resp.json()["refresh_token"]

    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_refresh_invalid_token(client: AsyncClient):
    """Test 8: Invalid refresh token returns 401."""
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": "not.a.valid.token"})
    assert resp.status_code == 401


# ─── /me ──────────────────────────────────────────────────────────────────────

async def test_get_me(client: AsyncClient):
    """Test 9: GET /auth/me returns current user info."""
    _, token = await create_user_and_token(
        client, "frank@test.com", "Pass1234!", "Frank", "learner"
    )
    resp = await client.get("/api/v1/auth/me", headers=await auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "frank@test.com"


async def test_get_me_no_token(client: AsyncClient):
    """Test 10: GET /auth/me without token returns 403 (missing Bearer)."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 403


async def test_google_login_not_configured(client: AsyncClient):
    """Test 11: Google OAuth endpoint returns 501 when not configured."""
    resp = await client.get("/api/v1/auth/google/login")
    # Should be 501 since GOOGLE_CLIENT_ID is not set in test env
    assert resp.status_code == 501
