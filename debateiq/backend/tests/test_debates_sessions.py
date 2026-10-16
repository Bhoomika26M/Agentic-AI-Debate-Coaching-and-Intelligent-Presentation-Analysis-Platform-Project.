import pytest

def get_auth_headers(client):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "learner@debateiq.ai", "password": "password123"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_list_formats(client):
    response = client.get("/api/v1/debates/formats")
    assert response.status_code == 200
    formats = response.json()
    assert len(formats) >= 6
    names = [f["name"] for f in formats]
    assert "AI Debate Simulation" in names
    assert "Oxford" in names
    assert "Parliamentary" in names

def test_list_and_create_topic(client):
    headers = get_auth_headers(client)
    topics_resp = client.get("/api/v1/debates/topics")
    assert topics_resp.status_code == 200
    topics = topics_resp.json()
    assert len(topics) >= 1

    create_resp = client.post(
        "/api/v1/debates/topics",
        headers=headers,
        json={
            "title": "Quantum Encryption Mandate",
            "motion_text": "This House Would mandate quantum-resistant encryption for financial institutions.",
            "category": "AI & Technology",
            "difficulty": "Intermediate",
        },
    )
    assert create_resp.status_code == 201
    assert create_resp.json()["title"] == "Quantum Encryption Mandate"

def test_create_session_and_submit_turn(client):
    headers = get_auth_headers(client)
    topics = client.get("/api/v1/debates/topics").json()
    topic_id = topics[0]["id"]

    # Schedule / Start session
    session_resp = client.post(
        "/api/v1/debates/sessions",
        headers=headers,
        json={
            "topic_id": topic_id,
            "format": "AI Debate Simulation",
            "user_position": "proposition",
            "ai_persona": "Socratic Questioner",
            "ai_opponent_difficulty": "Intermediate",
        },
    )
    assert session_resp.status_code == 201
    session_data = session_resp.json()
    session_id = session_data["id"]
    assert session_data["format"] == "AI Debate Simulation"

    # Submit human turn
    turn_resp = client.post(
        f"/api/v1/debates/sessions/{session_id}/turns",
        headers=headers,
        json={
            "speech_text": "We argue that autonomous security audits are strictly required because empirical data indicates a 40% reduction in cyber breaches.",
            "round_number": 1,
            "duration_seconds": 60,
        },
    )
    assert turn_resp.status_code == 200
    result = turn_resp.json()
    assert result["user_turn"] is not None
    assert result["ai_turn"] is not None
    assert "Socratic Questioner" in session_data["ai_persona"]
