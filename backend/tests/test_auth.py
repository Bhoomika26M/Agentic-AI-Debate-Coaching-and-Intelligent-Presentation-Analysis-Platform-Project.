import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newlearner@arena.ai",
            "password": "Password123!",
            "full_name": "New Learner",
            "role": "LEARNER"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newlearner@arena.ai"
    assert data["role"] == "LEARNER"
    assert "profile" in data

@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, learner_user):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": learner_user.email,
            "password": "AnotherPassword123!",
            "full_name": "Duplicate User",
            "role": "LEARNER"
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, learner_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": learner_user.email,
            "password": "LearnerPass123!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # Ensure refresh cookie is set
    assert "refresh_token" in response.cookies

@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, learner_user):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": learner_user.email,
            "password": "WrongPassword123!"
        }
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient, learner_token: str):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {learner_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "learner_test@arena.ai"

@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_refresh_token_flow(client: AsyncClient, learner_user):
    # Step 1: Login to get refresh cookie
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": learner_user.email,
            "password": "LearnerPass123!"
        }
    )
    refresh_val = login_res.cookies.get("refresh_token")
    assert refresh_val is not None

    # Step 2: Use refresh cookie to get new token
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_val}
    )
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()
