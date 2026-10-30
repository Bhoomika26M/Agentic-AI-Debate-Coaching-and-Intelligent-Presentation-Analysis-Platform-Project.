from uuid import uuid4
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.models.argument_analysis import ArgumentAnalysis
from app.models.debate import DebateArgument, DebateSession
from app.models.debate_coaching import DebateCoachingRecord
from app.models.presentation import PresentationAnalysis
from app.models.user import User

client = TestClient(app)


def create_authenticated_user():
    email = f"competency-test-{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/auth/register",
        json={"name": "Competency Learner", "email": email, "password": "Password123!"},
    )
    assert reg.status_code == 201
    login_res = client.post("/auth/login", json={"email": email, "password": "Password123!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, reg.json()


def test_unassessed_user_all_competencies_none():
    """A new user with no assessment history must receive None ('Not assessed') for all competencies."""
    headers, user = create_authenticated_user()

    res = client.get("/skills/me", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["communication_score"] is None
    assert data["critical_thinking_score"] is None
    assert data["argumentation_score"] is None
    assert data["confidence_score"] is None
    assert data["presentation_score"] is None
    assert data["has_activity"] is False
    assert data["provenance"]["debates_count"] == 0
    assert data["provenance"]["presentations_count"] == 0


def test_debate_only_user_never_receives_speech_scores():
    """
    CRITICAL REQUIREMENT: A user with debate assessments must NOT receive Speaking Confidence
    or Presentation Delivery scores when 0 speech recordings exist. No 70/100 fallback.
    """
    headers, user = create_authenticated_user()
    db = SessionLocal()
    try:
        debate = DebateSession(
            topic="Autonomous Vehicle Liability",
            format="oxford",
            created_by=user["id"],
            status="completed",
        )
        db.add(debate)
        db.commit()
        db.refresh(debate)

        arg = DebateArgument(
            debate_id=debate.id,
            user_id=user["id"],
            turn_order=1,
            position="for",
            content="Manufacturers must maintain strict liability for algorithmic failures in autonomous vehicles.",
        )
        db.add(arg)

        coaching = DebateCoachingRecord(
            debate_id=debate.id,
            user_id=user["id"],
            category_scores={
                "argument_quality": {"score": 88, "explanation": "High quality warrant"},
                "communication_clarity": {"score": 84, "explanation": "Precise vocabulary"},
                "logical_consistency": {"score": 82, "explanation": "No logical contradictions"},
                "rebuttal_effectiveness": {"score": 80, "explanation": "Addresses counterclaims"},
            },
            overall_score=83.5,
            overall_assessment="Strong performance across argumentation and logic.",
            strengths=["Clear premise", "Structured thesis"],
            weaknesses=["Could provide statutory citations"],
            improvement_suggestions=["Reference precedents"],
            improvement_plan={"strongest_skills": [], "areas_for_improvement": [], "practice_recommendations": [], "next_steps": [], "measurable_next_debate_goal": "Goal", "progress_indicators": []},
            source_argument_count=1,
            model="gemini-3.8-flash",
        )
        db.add(coaching)
        db.commit()
    finally:
        db.close()

    res = client.get("/skills/me", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["has_activity"] is True
    assert data["argumentation_score"] is not None
    assert data["communication_score"] is not None
    assert data["critical_thinking_score"] is not None

    # Speaking Confidence and Presentation Delivery MUST be None
    assert data["confidence_score"] is None
    assert data["presentation_score"] is None
    assert data["provenance"]["presentations_count"] == 0
    assert data["provenance"]["data_points"]["confidence"] == 0
    assert data["provenance"]["data_points"]["presentation"] == 0


def test_speech_presentation_evaluations_populate_confidence_and_delivery():
    """Completed speech presentations must populate Speaking Confidence and Presentation Delivery."""
    headers, user = create_authenticated_user()
    db = SessionLocal()
    try:
        pres = PresentationAnalysis(
            user_id=user["id"],
            display_filename="persuasive_keynote.mp3",
            storage_key="presentations/test_audio.mp3",
            submission_type="audio",
            mime_type="audio/mpeg",
            file_size_bytes=1024 * 500,
            status="completed",
            word_count=280,
            filler_word_count=4,
            speaking_rate_wpm=145.0,  # Optimal pace (125-165 WPM -> 95 score)
            analysis_result={
                "confidence_score": 88.0,
                "clarity_score": 90.0,
                "engagement_score": 85.0,
                "overall_score": 87.0,
            },
        )
        db.add(pres)
        db.commit()
    finally:
        db.close()

    res = client.post("/skills/sync", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["has_activity"] is True
    assert data["confidence_score"] is not None
    assert data["presentation_score"] is not None
    assert data["confidence_score"] >= 80
    assert data["presentation_score"] >= 80
    assert data["provenance"]["presentations_count"] == 1
    assert data["provenance"]["data_points"]["confidence"] > 0
    assert data["provenance"]["data_points"]["presentation"] > 0


def test_manual_baseline_override_disallowed():
    """Manual baseline overrides cannot inject arbitrary fake scores."""
    headers, user = create_authenticated_user()

    # Attempt to artificially set score to 99
    update_res = client.put(
        "/skills/me",
        headers=headers,
        json={
            "communication_score": 99,
            "critical_thinking_score": 99,
            "argumentation_score": 99,
            "confidence_score": 99,
            "presentation_score": 99,
        },
    )
    assert update_res.status_code == 200
    data = update_res.json()

    # Must NOT have accepted 99 because there are 0 performance assessments!
    assert data["communication_score"] is None
    assert data["confidence_score"] is None
    assert data["presentation_score"] is None
