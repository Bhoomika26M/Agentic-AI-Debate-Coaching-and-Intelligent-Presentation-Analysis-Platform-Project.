import pytest

def get_auth_headers(client, role="Learner"):
    email_map = {
        "Learner": "learner@debateiq.ai",
        "Coach": "coach@debateiq.ai",
        "Educator": "educator@debateiq.ai",
        "Admin": "admin@debateiq.ai",
    }
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email_map[role], "password": "password123"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_ai_personas(client):
    resp = client.get("/api/v1/simulation/personas")
    assert resp.status_code == 200
    personas = resp.json()
    assert len(personas) >= 3
    ids = [p["id"] for p in personas]
    assert "socratic" in ids
    assert "professor" in ids
    assert "politician" in ids

def test_spar_and_whisper(client):
    spar_resp = client.post(
        "/api/v1/simulation/spar",
        json={
            "motion_text": "This House Would replace fossil fuels with nuclear energy.",
            "user_argument": "Nuclear energy provides reliable baseline zero-carbon electricity without weather dependency.",
            "ai_persona": "Logical Professor",
            "difficulty": "Intermediate",
            "round_number": 1,
        },
    )
    assert spar_resp.status_code == 200
    spar_data = spar_resp.json()
    assert "response_speech" in spar_data
    assert len(spar_data["response_speech"]) > 30

    whisper_resp = client.post(
        "/api/v1/simulation/whisper",
        json={
            "motion_text": "This House Would replace fossil fuels with nuclear energy.",
            "user_position": "proposition",
            "current_user_speech": "Nuclear energy provides zero carbon baseline power.",
            "ai_opponent_speech": spar_data["response_speech"],
        },
    )
    assert whisper_resp.status_code == 200
    whisper_data = whisper_resp.json()
    assert "hint" in whisper_data
    assert "recommended_angle" in whisper_data

def test_coaching_drills_and_plans(client):
    headers = get_auth_headers(client, "Learner")
    drills_resp = client.get("/api/v1/coaching/drills")
    assert drills_resp.status_code == 200
    drills = drills_resp.json()
    assert len(drills) >= 3

    plans_resp = client.get("/api/v1/coaching/plans", headers=headers)
    assert plans_resp.status_code == 200
    plans = plans_resp.json()
    assert len(plans) >= 1

def test_role_dashboards(client):
    # Learner Dashboard
    l_headers = get_auth_headers(client, "Learner")
    l_resp = client.get("/api/v1/dashboards/learner", headers=l_headers)
    assert l_resp.status_code == 200
    l_data = l_resp.json()
    assert len(l_data["radar_data"]) == 5
    assert "debater_xp" in l_data["profile"]

    # Coach Dashboard
    c_headers = get_auth_headers(client, "Coach")
    c_resp = client.get("/api/v1/dashboards/coach", headers=c_headers)
    assert c_resp.status_code == 200
    c_data = c_resp.json()
    assert len(c_data["students"]) >= 1

    # Educator Dashboard
    e_headers = get_auth_headers(client, "Educator")
    e_resp = client.get("/api/v1/dashboards/educator", headers=e_headers)
    assert e_resp.status_code == 200
    e_data = e_resp.json()
    assert "top_performers" in e_data
