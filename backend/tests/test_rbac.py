"""
Tests for RBAC — role-based access control enforcement.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import create_user_and_token, auth_headers

pytestmark = pytest.mark.asyncio


async def test_learner_cannot_list_users(client: AsyncClient):
    """Test 12: Learner cannot access GET /users (requires educator/admin)."""
    _, token = await create_user_and_token(client, "learner1@test.com", "Pass1234!", role="learner")
    resp = await client.get("/api/v1/users", headers=await auth_headers(token))
    assert resp.status_code == 403


async def test_educator_can_list_users(client: AsyncClient):
    """Test 13: Educator can list users."""
    _, token = await create_user_and_token(client, "edu1@test.com", "Pass1234!", role="educator")
    resp = await client.get("/api/v1/users", headers=await auth_headers(token))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_learner_cannot_create_topic(client: AsyncClient):
    """Test 14: Learner cannot create debate topics."""
    _, token = await create_user_and_token(client, "learner2@test.com", "Pass1234!", role="learner")
    resp = await client.post(
        "/api/v1/topics",
        json={"title": "Test Topic", "category": "Test"},
        headers=await auth_headers(token),
    )
    assert resp.status_code == 403


async def test_educator_can_create_topic(client: AsyncClient):
    """Test 15: Educator can create debate topics."""
    _, token = await create_user_and_token(client, "edu2@test.com", "Pass1234!", role="educator")
    resp = await client.post(
        "/api/v1/topics",
        json={"title": "AI Ethics", "category": "Technology"},
        headers=await auth_headers(token),
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "AI Ethics"


async def test_coach_can_add_skill_for_learner(client: AsyncClient):
    """Test 16: Coach can add skill records for a learner."""
    learner, _ = await create_user_and_token(
        client, "learner3@test.com", "Pass1234!", role="learner"
    )
    _, coach_token = await create_user_and_token(
        client, "coach1@test.com", "Pass1234!", role="debate_coach"
    )
    learner_id = learner["id"]
    resp = await client.post(
        f"/api/v1/skills/users/{learner_id}",
        json={"skill_type": "clarity", "score": 7.5, "source": "manual"},
        headers=await auth_headers(coach_token),
    )
    assert resp.status_code == 201
    assert resp.json()["score"] == 7.5


async def test_learner_cannot_delete_topic(client: AsyncClient):
    """Test 17: Only admin can delete topics."""
    _, edu_token = await create_user_and_token(client, "edu3@test.com", "Pass1234!", role="educator")
    # Create topic as educator
    topic_resp = await client.post(
        "/api/v1/topics",
        json={"title": "Topic to delete", "category": "Test"},
        headers=await auth_headers(edu_token),
    )
    topic_id = topic_resp.json()["id"]

    # Learner tries to delete
    _, learner_token = await create_user_and_token(
        client, "learner4@test.com", "Pass1234!", role="learner"
    )
    del_resp = await client.delete(
        f"/api/v1/topics/{topic_id}",
        headers=await auth_headers(learner_token),
    )
    assert del_resp.status_code == 403


async def test_unauthenticated_access_denied(client: AsyncClient):
    """Test 18: Unauthenticated requests to protected routes are rejected."""
    resp = await client.get("/api/v1/topics")
    assert resp.status_code == 403
