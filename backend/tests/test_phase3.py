import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_my_profile(client: AsyncClient, learner_token: str):
    response = await client.get(
        "/api/v1/profile/",
        headers={"Authorization": f"Bearer {learner_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "experience_level" in data
    assert "preferred_topics" in data

@pytest.mark.asyncio
async def test_update_my_profile(client: AsyncClient, learner_token: str):
    response = await client.patch(
        "/api/v1/profile/",
        headers={"Authorization": f"Bearer {learner_token}"},
        json={
            "bio": "Aspiring collegiate parliamentary debater.",
            "preferred_topics": ["AI Ethics", "Climate Policy"],
            "coaching_style": "Analytical"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["bio"] == "Aspiring collegiate parliamentary debater."
    assert "Climate Policy" in data["preferred_topics"]

@pytest.mark.asyncio
async def test_create_and_list_goals(client: AsyncClient, learner_token: str):
    # 1. Create a goal
    create_res = await client.post(
        "/api/v1/goals/",
        headers={"Authorization": f"Bearer {learner_token}"},
        json={
            "title": "Master Ad Hominem refutation",
            "progress": 30
        }
    )
    assert create_res.status_code == 201
    goal_id = create_res.json()["id"]

    # 2. List goals
    list_res = await client.get(
        "/api/v1/goals/",
        headers={"Authorization": f"Bearer {learner_token}"}
    )
    assert list_res.status_code == 200
    assert any(g["id"] == goal_id for g in list_res.json())

    # 3. Update goal
    patch_res = await client.patch(
        f"/api/v1/goals/{goal_id}",
        headers={"Authorization": f"Bearer {learner_token}"},
        json={"progress": 75}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["progress"] == 75

@pytest.mark.asyncio
async def test_coach_can_create_topic(client: AsyncClient, admin_token: str):
    response = await client.post(
        "/api/v1/topics/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Universal Basic Income in the Age of Autonomous AI",
            "description": "Examine the macroeconomic and human welfare implications.",
            "category": "Economics & Technology",
            "difficulty": "INTERMEDIATE"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Universal Basic Income in the Age of Autonomous AI"

@pytest.mark.asyncio
async def test_learner_forbidden_from_creating_topic(client: AsyncClient, learner_token: str):
    response = await client.post(
        "/api/v1/topics/",
        headers={"Authorization": f"Bearer {learner_token}"},
        json={
            "title": "Learner unauthorized debate topic attempt",
            "description": "Should be blocked by require_roles dependency.",
            "category": "Testing",
            "difficulty": "BEGINNER"
        }
    )
    assert response.status_code == 403
