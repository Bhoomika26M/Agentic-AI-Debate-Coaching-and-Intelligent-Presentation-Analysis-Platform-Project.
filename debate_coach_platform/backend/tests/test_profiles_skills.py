def get_token_for(client, email):
    res = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    return res.json()["access_token"]

def test_get_and_update_profile(client):
    token = get_token_for(client, "learner@debatecoach.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch initial profile
    res = client.get("/api/profiles/me", headers=headers)
    assert res.status_code == 200
    profile = res.json()
    assert profile["experience_level"] == "Intermediate"
    assert "AI & Technology" in profile["preferred_topics"]

    # Update profile
    update_payload = {
        "experience_level": "Advanced",
        "preferred_topics": ["Ethics", "AI & Technology", "Space Law"],
        "presentation_domains": ["Keynote", "Oxford Debate"],
        "learning_goals": "Master cross-examination in Oxford debates."
    }
    put_res = client.put("/api/profiles/me", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["experience_level"] == "Advanced"
    assert "Space Law" in updated["preferred_topics"]

def test_get_skills_and_weighted_scoring_model(client):
    token = get_token_for(client, "learner@debatecoach.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # First update skills to known exact values
    update_payload = {
        "argument_quality": 80.0,         # 30% -> 24.0
        "evidence_usage": 90.0,           # 20% -> 18.0
        "logical_consistency": 85.0,      # 20% -> 17.0
        "rebuttal_effectiveness": 70.0,   # 15% -> 10.5
        "communication_skills": 80.0      # 15% -> 12.0
        # Total expected: 24.0 + 18.0 + 17.0 + 10.5 + 12.0 = 81.5
    }
    put_res = client.put("/api/skills/me", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["overall_performance_score"] == 81.5

def test_recalibrate_skills_rbac(client):
    learner_token = get_token_for(client, "learner@debatecoach.ai")
    coach_token = get_token_for(client, "coach@debatecoach.ai")

    # Get learner user ID
    learner_info = client.get("/api/auth/me", headers={"Authorization": f"Bearer {learner_token}"}).json()
    learner_id = learner_info["id"]

    # Learner trying to recalibrate another user's skills directly should fail with 403
    fail_res = client.post(
        f"/api/skills/{learner_id}/recalibrate",
        json={"argument_quality": 99.0},
        headers={"Authorization": f"Bearer {learner_token}"}
    )
    assert fail_res.status_code == 403

    # Coach can recalibrate
    ok_res = client.post(
        f"/api/skills/{learner_id}/recalibrate",
        json={"argument_quality": 88.0},
        headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["argument_quality"] == 88.0
