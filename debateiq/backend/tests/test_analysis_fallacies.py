import pytest

def get_auth_headers(client):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "learner@debateiq.ai", "password": "password123"},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_argument_analysis(client):
    text = (
        "We must urgently transition our national electrical grid to renewable energy. "
        "A 2024 Stanford University study demonstrates that solar generation costs have declined by 82% over the last decade. "
        "Because atmospheric carbon accumulation causes irreversible ecological tipping points, the government has a moral duty to act."
    )
    resp = client.post(
        "/api/v1/analysis/arguments",
        json={"text": text, "context": "Renewable Energy Policy"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "claim" in data
    assert len(data["premises"]) >= 1
    assert len(data["evidence"]) >= 1
    assert data["scores"]["clarity"] > 0
    assert data["scores"]["evidence_strength"] >= 80

def test_fallacy_detection_ad_hominem_strawman_false_dilemma(client):
    text = (
        "You cannot trust Senator Miller's tax plan because he is an uneducated fool. "
        "My opponent wants to abolish all private enterprise, which proves they want to destroy personal freedom. "
        "Either we ban all fossil fuels tomorrow or society will collapse in five days."
    )
    resp = client.post(
        "/api/v1/analysis/fallacies",
        json={"text": text, "context": "Economic Policy"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_count"] >= 3
    fallacy_names = [f["fallacy_type"] for f in data["fallacies_detected"]]
    assert "Ad Hominem" in fallacy_names
    assert "Straw Man" in fallacy_names
    assert "False Dilemma" in fallacy_names

    # Check guided rewrite and explanation exist
    for f in data["fallacies_detected"]:
        assert len(f["explanation"]) > 10
        assert len(f["corrected_rewrite"]) > 10
        assert f["span_end"] > f["span_start"]

def test_fallacy_catalog(client):
    resp = client.get("/api/v1/analysis/fallacy-catalog")
    assert resp.status_code == 200
    catalog = resp.json()
    assert len(catalog) == 8
    names = [c["name"] for c in catalog]
    assert "Ad Hominem" in names
    assert "Straw Man" in names
    assert "False Dilemma" in names
    assert "Slippery Slope" in names
    assert "Appeal to Authority" in names
    assert "Circular Reasoning" in names
    assert "Hasty Generalization" in names
    assert "Red Herring" in names

def test_rebuttal_matrix(client):
    resp = client.post(
        "/api/v1/analysis/rebuttals",
        json={
            "target_claim": "The government should mandate a four-day work week for all corporations.",
            "motion_context": "Labor Policy",
            "target_position": "opposition",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["rebuttals"]) == 5
    perspectives = [r["perspective"] for r in data["rebuttals"]]
    assert "Logical" in perspectives
    assert "Evidence-Based" in perspectives
    assert "Ethical" in perspectives
    assert "Practical" in perspectives
    assert "Policy" in perspectives
    assert len(data["recommended_strategy"]) > 10

def test_exact_weighted_scoring_model(client):
    headers = get_auth_headers(client)
    # Test scoring formula:
    # 0.30 * 90.0 + 0.20 * 80.0 + 0.20 * 85.0 + 0.15 * 70.0 + 0.15 * 80.0
    # = 27.0 + 16.0 + 17.0 + 10.5 + 12.0 = 82.5
    resp = client.post(
        "/api/v1/scoring/evaluate",
        headers=headers,
        json={
            "argument_quality": 90.0,
            "evidence_usage": 80.0,
            "logical_consistency": 85.0,
            "rebuttal_effectiveness": 70.0,
            "communication_skills": 80.0,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    expected = round(0.30 * 90.0 + 0.20 * 80.0 + 0.20 * 85.0 + 0.15 * 70.0 + 0.15 * 80.0, 1)
    assert data["scores"]["overall_performance_score"] == expected
    assert data["weights_applied"]["argument_quality"] == 0.30
    assert data["weights_applied"]["evidence_usage"] == 0.20
    assert data["weights_applied"]["logical_consistency"] == 0.20
    assert data["weights_applied"]["rebuttal_effectiveness"] == 0.15
    assert data["weights_applied"]["communication_skills"] == 0.15
