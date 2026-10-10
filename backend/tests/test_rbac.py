import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_admin_can_list_users(client: AsyncClient, admin_token: str):
    response = await client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 1

@pytest.mark.asyncio
async def test_learner_forbidden_from_listing_users(client: AsyncClient, learner_token: str):
    response = await client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {learner_token}"}
    )
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]

@pytest.mark.asyncio
async def test_admin_can_change_user_role(client: AsyncClient, admin_token: str, learner_user):
    response = await client.put(
        f"/api/v1/users/{learner_user.id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "DEBATE_COACH"}
    )
    assert response.status_code == 200
    assert response.json()["role"] == "DEBATE_COACH"

@pytest.mark.asyncio
async def test_learner_forbidden_from_changing_role(client: AsyncClient, learner_token: str, learner_user):
    response = await client.put(
        f"/api/v1/users/{learner_user.id}/role",
        headers={"Authorization": f"Bearer {learner_token}"},
        json={"role": "ADMIN"}
    )
    assert response.status_code == 403
