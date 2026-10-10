from datetime import datetime, timedelta, timezone

def get_token_for(client, email):
    res = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return res.json()["access_token"]

def test_list_supported_debate_formats(client):
    res = client.get("/api/debates/formats")
    assert res.status_code == 200
    formats = res.json()
    format_names = [f["name"] for f in formats]
    assert len(formats) == 6
    assert "One-on-One Debate" in format_names
    assert "Parliamentary Debate" in format_names
    assert "Oxford Debate" in format_names
    assert "Policy Debate" in format_names
    assert "Public Forum Debate" in format_names
    assert "AI Debate Simulation" in format_names

def test_topic_creation_rbac(client):
    learner_token = get_token_for(client, "learner@debatecoach.ai")
    coach_token = get_token_for(client, "coach@debatecoach.ai")

    topic_data = {
        "title": "Quantum Computing Ethics",
        "motion_text": "This House Would Prohibit Commercialization of Cryptanalytic Quantum Hardware.",
        "category": "AI & Technology",
        "difficulty_level": "Advanced",
        "proposition_stance": "National security and infrastructure safety dictate restriction.",
        "opposition_stance": "Open commercialization accelerates peaceful scientific breakthroughs."
    }

    # Learner cannot create topics
    learner_res = client.post(
        "/api/debates/topics",
        json=topic_data,
        headers={"Authorization": f"Bearer {learner_token}"}
    )
    assert learner_res.status_code == 403

    # Coach can create topics
    coach_res = client.post(
        "/api/debates/topics",
        json=topic_data,
        headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert coach_res.status_code == 201
    assert coach_res.json()["title"] == "Quantum Computing Ethics"

def test_schedule_debate_session_and_lifecycle(client):
    learner_token = get_token_for(client, "learner@debatecoach.ai")
    headers = {"Authorization": f"Bearer {learner_token}"}

    # Fetch available topics
    topics_res = client.get("/api/debates/topics")
    assert topics_res.status_code == 200
    topic_id = topics_res.json()[0]["id"]

    # Schedule a session
    scheduled_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    session_payload = {
        "topic_id": topic_id,
        "debate_format": "Parliamentary Debate",
        "session_title": "Inter-University Parliamentary Match",
        "scheduled_start": scheduled_time,
        "initial_position": "proposition"
    }
    create_res = client.post("/api/debates/sessions", json=session_payload, headers=headers)
    assert create_res.status_code == 201
    session_data = create_res.json()
    assert session_data["status"] == "scheduled"
    assert session_data["debate_format"] == "Parliamentary Debate"
    assert len(session_data["participants"]) >= 1
    session_id = session_data["id"]

    # Status transition: start debate
    start_res = client.patch(
        f"/api/debates/sessions/{session_id}",
        json={"status": "in_progress"},
        headers=headers
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "in_progress"
    assert start_res.json()["actual_start"] is not None

    # Status transition: complete debate
    comp_res = client.patch(
        f"/api/debates/sessions/{session_id}",
        json={"status": "completed"},
        headers=headers
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"
    assert comp_res.json()["actual_end"] is not None

def test_join_and_leave_session(client):
    learner_token = get_token_for(client, "learner@debatecoach.ai")
    coach_token = get_token_for(client, "coach@debatecoach.ai")

    # Fetch a session created in seed
    sessions_res = client.get("/api/debates/sessions")
    assert sessions_res.status_code == 200
    session_id = sessions_res.json()[0]["id"]

    # Coach joins as adjudicator
    join_res = client.post(
        f"/api/debates/sessions/{session_id}/join",
        json={"position": "adjudicator", "speaking_order": 99},
        headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert join_res.status_code == 200
    positions = [p["position"] for p in join_res.json()["participants"]]
    assert "adjudicator" in positions

    # Coach leaves
    leave_res = client.post(
        f"/api/debates/sessions/{session_id}/leave",
        headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert leave_res.status_code == 200
    assert "Successfully left" in leave_res.json()["message"]
