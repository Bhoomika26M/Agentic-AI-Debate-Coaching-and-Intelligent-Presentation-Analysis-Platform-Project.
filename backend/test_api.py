from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.schemas.argument import ArgumentAnalysisRequest, FallacyDetectionRequest, CounterargumentRequest
from app.schemas.user import UserRoleUpdate
from app.routers.arguments import analyze_argument
from app.routers.fallacies import detect_fallacies
from app.routers.counterarguments import generate_counterarguments
from app.routers.analytics import get_dashboard_analytics
from app.routers.admin import update_user_role, get_system_metrics
from app.routers.presentation import analyze_text_presentation
from app.services.export_service import export_service

def run_tests():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == 'admin@justitalk.com').first()
    learner = db.query(User).filter(User.email == 'learner@justitalk.com').first()

    print("1. Testing Analytics Dashboard...")
    dash = get_dashboard_analytics(db=db, current_user=admin)
    print("   Total Debates:", dash["total_debates"], "Won:", dash["debates_won"], "Avg Score:", dash["average_score"])
    assert dash["total_debates"] >= 7
    assert dash["average_score"] > 0

    print("2. Testing Argument Analysis...")
    arg_res = analyze_argument(ArgumentAnalysisRequest(argument="Universal healthcare reduces societal bankruptcies and boosts productivity."), db=db, current_user=admin)
    print("   Score:", arg_res["overall_score"], "Inference Mode:", arg_res.get("inference_mode"))
    assert arg_res["overall_score"] > 0

    print("3. Testing Logical Fallacy Detection...")
    fal_res = detect_fallacies(FallacyDetectionRequest(text="You are a corrupt idiot and nobody should listen to your ideas."), db=db, current_user=admin)
    print("   Fallacy Detected:", fal_res["has_fallacies"], [f["name"] for f in fal_res["fallacies"]])
    assert fal_res["has_fallacies"] is True
    assert "Ad Hominem" in [f["name"] for f in fal_res["fallacies"]]

    print("4. Testing Counterargument Generation...")
    counter_res = generate_counterarguments(CounterargumentRequest(argument="All standardized testing should be abolished."), db=db, current_user=admin)
    print("   Rebuttals generated:", len(counter_res["logical_rebuttals"]))
    assert len(counter_res["logical_rebuttals"]) > 0

    print("5. Testing Text Presentation Analysis...")
    pres_res = analyze_text_presentation(title="Test Speech", transcription="Good afternoon. Today we address autonomous models.", estimated_duration_seconds=30.0, db=db, current_user=admin)
    print("   WPM:", pres_res.words_per_minute, "Pace:", pres_res.speech_pace_label)
    assert pres_res.words_per_minute > 0

    print("6. Testing Presentation PDF Export...")
    pdf_path = export_service.generate_presentation_pdf({
        "id": pres_res.id,
        "title": pres_res.title,
        "duration_seconds": pres_res.duration_seconds,
        "transcription": pres_res.transcription,
        "words_per_minute": pres_res.words_per_minute,
        "speech_pace_label": pres_res.speech_pace_label,
        "filler_words_count": pres_res.filler_words_count,
        "confidence_score": pres_res.confidence_score,
        "clarity_score": pres_res.clarity_score,
        "overall_presentation_score": pres_res.overall_presentation_score,
        "strengths": pres_res.strengths,
        "improvement_recommendations": pres_res.improvement_recommendations
    })
    print("   PDF generated at:", pdf_path)

    print("7. Testing Admin Role Elevation...")
    role_res = update_user_role(user_id=learner.id, role_in=UserRoleUpdate(role=UserRole.DEBATE_COACH), db=db, admin_user=admin)
    print("   Learner role changed to:", role_res.role)
    assert role_res.role == UserRole.DEBATE_COACH

    # Revert back for consistency
    update_user_role(user_id=learner.id, role_in=UserRoleUpdate(role=UserRole.LEARNER), db=db, admin_user=admin)

    db.close()
    print("\n[SUCCESS] ALL BACKEND AND DATABASE AUDIT CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
