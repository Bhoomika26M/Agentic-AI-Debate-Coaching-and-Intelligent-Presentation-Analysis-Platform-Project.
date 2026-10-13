"""
Tests for debate session lifecycle and skill tracking.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import create_user_and_token, auth_headers

pytestmark = pytest.mark.asyncio


async def _create_topic(client, token):
    resp = await client.post(
        "/api/v1/topics",
        json={"title": "Test Debate Topic", "category": "General"},
        headers=await auth_headers(token),
    )
    assert resp.status_code == 201
    return resp.json()["id"]


async def test_create_session(client: AsyncClient):
    """Test 19: Educator creates a debate session."""
    _, edu_token = await create_user_and_token(client, "edu_s1@test.com", "Pass1234!", role="educator")
    topic_id = await _create_topic(client, edu_token)

    resp = await client.post(
        "/api/v1/sessions",
        json={"topic_id": topic_id, "format": "oxford", "position": "observer"},
        headers=await auth_headers(edu_token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "scheduled"
    assert data["format"] == "oxford"


async def test_join_session(client: AsyncClient):
    """Test 20: Learner joins an existing session."""
    _, edu_token = await create_user_and_token(client, "edu_s2@test.com", "Pass1234!", role="educator")
    topic_id = await _create_topic(client, edu_token)
    sess_resp = await client.post(
        "/api/v1/sessions",
        json={"topic_id": topic_id, "format": "one_on_one", "position": "judge"},
        headers=await auth_headers(edu_token),
    )
    session_id = sess_resp.json()["id"]

    _, learner_token = await create_user_and_token(
        client, "learner_s1@test.com", "Pass1234!", role="learner"
    )
    join_resp = await client.post(
        f"/api/v1/sessions/{session_id}/join",
        json={"position": "for"},
        headers=await auth_headers(learner_token),
    )
    assert join_resp.status_code == 201
    assert join_resp.json()["position"] == "for"


async def test_start_and_complete_session(client: AsyncClient):
    """Test 21: Full session lifecycle: scheduled → active → completed."""
    _, edu_token = await create_user_and_token(client, "edu_s3@test.com", "Pass1234!", role="educator")
    topic_id = await _create_topic(client, edu_token)
    sess_resp = await client.post(
        "/api/v1/sessions",
        json={"topic_id": topic_id, "format": "parliamentary", "position": "observer"},
        headers=await auth_headers(edu_token),
    )
    session_id = sess_resp.json()["id"]

    # Start
    start_resp = await client.post(
        f"/api/v1/sessions/{session_id}/start",
        headers=await auth_headers(edu_token),
    )
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "active"

    # Complete
    complete_resp = await client.post(
        f"/api/v1/sessions/{session_id}/complete",
        headers=await auth_headers(edu_token),
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "completed"


async def test_cancel_session(client: AsyncClient):
    """Test 22: Creator can cancel a scheduled session."""
    _, edu_token = await create_user_and_token(client, "edu_s4@test.com", "Pass1234!", role="educator")
    topic_id = await _create_topic(client, edu_token)
    sess_resp = await client.post(
        "/api/v1/sessions",
        json={"topic_id": topic_id, "format": "policy", "position": "observer"},
        headers=await auth_headers(edu_token),
    )
    session_id = sess_resp.json()["id"]

    cancel_resp = await client.post(
        f"/api/v1/sessions/{session_id}/cancel",
        headers=await auth_headers(edu_token),
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"


async def test_cannot_join_completed_session(client: AsyncClient):
    """Test 23: Cannot join a completed session."""
    _, edu_token = await create_user_and_token(client, "edu_s5@test.com", "Pass1234!", role="educator")
    topic_id = await _create_topic(client, edu_token)
    sess_resp = await client.post(
        "/api/v1/sessions",
        json={"topic_id": topic_id, "format": "oxford", "position": "judge"},
        headers=await auth_headers(edu_token),
    )
    session_id = sess_resp.json()["id"]

    await client.post(f"/api/v1/sessions/{session_id}/start", headers=await auth_headers(edu_token))
    await client.post(f"/api/v1/sessions/{session_id}/complete", headers=await auth_headers(edu_token))

    _, learner_token = await create_user_and_token(
        client, "learner_s2@test.com", "Pass1234!", role="learner"
    )
    join_resp = await client.post(
        f"/api/v1/sessions/{session_id}/join",
        json={"position": "for"},
        headers=await auth_headers(learner_token),
    )
    assert join_resp.status_code == 400


async def test_skill_summary(client: AsyncClient):
    """Test 24: GET /skills/me/summary returns skill summary."""
    _, token = await create_user_and_token(client, "learner_sk1@test.com", "Pass1234!", role="learner")

    # Add two clarity records
    for score in [6.0, 8.0]:
        await client.post(
            "/api/v1/skills/me",
            json={"skill_type": "clarity", "score": score},
            headers=await auth_headers(token),
        )

    resp = await client.get("/api/v1/skills/me/summary", headers=await auth_headers(token))
    assert resp.status_code == 200
    skills = resp.json()["skills"]
    clarity = next((s for s in skills if s["skill_type"] == "clarity"), None)
    assert clarity is not None
    assert clarity["latest_score"] == 8.0
    assert clarity["trend"] == pytest.approx(2.0)


async def test_list_my_sessions(client: AsyncClient):
    """Test 25: Learner sees only their own sessions."""
    _, edu_token = await create_user_and_token(client, "edu_s6@test.com", "Pass1234!", role="educator")
    topic_id = await _create_topic(client, edu_token)

    _, learner_token = await create_user_and_token(
        client, "learner_s3@test.com", "Pass1234!", role="learner"
    )

    # Create session as educator
    sess_resp = await client.post(
        "/api/v1/sessions",
        json={"topic_id": topic_id, "format": "oxford", "position": "observer"},
        headers=await auth_headers(edu_token),
    )
    session_id = sess_resp.json()["id"]

    # Learner joins
    await client.post(
        f"/api/v1/sessions/{session_id}/join",
        json={"position": "for"},
        headers=await auth_headers(learner_token),
    )

    # Learner sees their joined session
    list_resp = await client.get("/api/v1/sessions", headers=await auth_headers(learner_token))
    assert list_resp.status_code == 200
    session_ids = [s["id"] for s in list_resp.json()]
    assert session_id in session_ids

    # Educator's session list also contains it
    edu_list_resp = await client.get("/api/v1/sessions", headers=await auth_headers(edu_token))
    edu_ids = [s["id"] for s in edu_list_resp.json()]
    assert session_id in edu_ids
