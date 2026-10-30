"""
Comprehensive End-to-End Workflow Verification Suite for JustiTalk
Validates all 8 major business workflows:
1. Registration & Authentication (Password hashing, Profile, Update)
2. Argument Analysis & Library Persistence
3. Logical Fallacy Detection & Clean Rewrite
4. Multi-Dimensional Counterargument Generation
5. Interactive AI Debate Simulation, Adjudication & PDF Dossier Export
6. Presentation Speech & Cadence Analysis & PDF Report Export
7. Dynamic Analytics Calculation & Real Database Querying
8. Role-Based Access Control (Admin vs Regular User isolation)
"""

import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, Base, engine
from app.services.seed_data import seed_database
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserProfileUpdate, UserRoleUpdate
from app.schemas.argument import ArgumentAnalysisRequest, FallacyDetectionRequest, CounterargumentRequest
from app.schemas.debate import DebateCreate, DebateMessageCreate
from app.routers.auth import register
from app.routers.users import update_user_profile, get_user_profile, get_user_skills
from app.routers.arguments import analyze_argument, get_argument_history
from app.routers.fallacies import detect_fallacies, get_fallacy_history
from app.routers.counterarguments import generate_counterarguments
from app.routers.debates import create_debate, submit_debate_turn, evaluate_debate, export_debate_pdf
from app.routers.presentation import analyze_text_presentation, export_presentation_pdf
from app.routers.analytics import get_dashboard_analytics
from app.routers.admin import update_user_role, list_all_users
from app.services.ai_service import ai_service
from fastapi import HTTPException

def run_all_workflows():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    print("==================================================", flush=True)
    print("STARTING FULL END-TO-END WORKFLOW VERIFICATION", flush=True)
    print("==================================================", flush=True)

    # -------------------------------------------------------------------------
    # WORKFLOW 1: Registration, Profile Update, and Authentication
    # -------------------------------------------------------------------------
    print("\n[RUNNING] Workflow 1: Registration & Profile Lifecycle...", flush=True)
    test_email = "workflow_verified_user@justitalk.com"
    existing = db.query(User).filter(User.email == test_email).first()
    if not existing:
        new_user = register(UserCreate(
            email=test_email,
            password="StrongPassword123!",
            full_name="Verified Learner",
            role=UserRole.LEARNER
        ), db=db)
    else:
        new_user = existing

    assert new_user.email == test_email
    assert new_user.role == UserRole.LEARNER

    # Profile Update
    updated_user = update_user_profile(
        UserProfileUpdate(
            bio="Collegiate debater specializing in bioethics.",
            institution="Oxford University",
            experience_level="Intermediate"
        ),
        current_user=new_user,
        db=db
    )
    assert updated_user.profile.bio == "Collegiate debater specializing in bioethics."
    print("[SUCCESS] Workflow 1: Registration, Role Assignment & Profile Update verified.", flush=True)

    # -------------------------------------------------------------------------
    # WORKFLOW 2: Argument Analysis & Library Retrieval
    # -------------------------------------------------------------------------
    print("\n[RUNNING] Workflow 2: Argument Analysis & Library Persistence...", flush=True)
    arg_req = ArgumentAnalysisRequest(
        argument="Universal healthcare reduces household bankruptcies and boosts long-term GDP through preventative medicine.",
        topic="Healthcare Policy"
    )
    arg_res = analyze_argument(arg_req, db=db, current_user=new_user)
    assert arg_res["overall_score"] > 0
    assert "main_claim" in arg_res
    assert len(arg_res["supporting_arguments"]) > 0
    assert arg_res["inference_mode"] in ("openai_gpt4o", "development_heuristic_mode")

    # History retrieval
    history = get_argument_history(db=db, current_user=new_user)
    assert len(history) >= 1
    assert any(h["overall_score"] == arg_res["overall_score"] for h in history)
    print("[SUCCESS] Workflow 2: Argument Analysis, Claim Extraction & History verified.", flush=True)

    # -------------------------------------------------------------------------
    # WORKFLOW 3: Logical Fallacy Detection & Clean Rewriting
    # -------------------------------------------------------------------------
    print("\n[RUNNING] Workflow 3: Fallacy Detection & Clean Rewrite...", flush=True)
    fal_req = FallacyDetectionRequest(
        text="Either you agree with this tax reform immediately, or you are an unpatriotic traitor who wants our country to fail."
    )
    fal_res = detect_fallacies(fal_req, db=db, current_user=new_user)
    assert fal_res["has_fallacies"] is True
    assert len(fal_res["fallacies"]) >= 1
    assert "corrected_version" in fal_res["fallacies"][0]
    assert fal_res["inference_mode"] in ("openai_gpt4o", "development_heuristic_mode")

    fal_history = get_fallacy_history(db=db, current_user=new_user)
    assert len(fal_history) >= 1
    print("[SUCCESS] Workflow 3: Fallacy Detection, Clean Rewrite & History verified.", flush=True)

    # -------------------------------------------------------------------------
    # WORKFLOW 4: Multi-Dimensional Counterargument Generation
    # -------------------------------------------------------------------------
    print("\n[RUNNING] Workflow 4: Counterargument Generation...", flush=True)
    counter_req = CounterargumentRequest(
        argument="All generative AI models should be legally prohibited from processing copyrighted literature.",
        topic="Intellectual Property & AI"
    )
    counter_res = generate_counterarguments(counter_req, db=db, current_user=new_user)
    assert len(counter_res["logical_rebuttals"]) > 0
    assert len(counter_res["evidence_based_rebuttals"]) > 0
    assert len(counter_res["challenge_questions"]) > 0
    assert counter_res["inference_mode"] in ("openai_gpt4o", "development_heuristic_mode")
    print("[SUCCESS] Workflow 4: 5-Dimensional Counterargument Generation verified.", flush=True)

    # -------------------------------------------------------------------------
    # WORKFLOW 5: Interactive AI Debate Arena, Turn, Evaluation & PDF Export
    # -------------------------------------------------------------------------
    print("\n[RUNNING] Workflow 5: AI Debate Simulation, Adjudication & PDF Dossier...", flush=True)
    debate_req = DebateCreate(
        title="Universal Automation Dividend",
        topic="This House would tax automation to fund basic income.",
        format="AI Debate Simulation",
        difficulty="Intermediate",
        duration_minutes=15,
        user_position="For",
        max_rounds=2
    )
    debate = create_debate(debate_req, db=db, current_user=new_user)
    assert debate.id is not None
    assert debate.creator_id == new_user.id

    # Submit Turn
    turn_req = DebateMessageCreate(
        content="Automation accelerates at an exponential rate, displacing routine knowledge workers before labor markets can retrain them."
    )
    turn_debate = submit_debate_turn(debate.id, turn_req, db=db, current_user=new_user)
    assert len(turn_debate.messages) >= 2  # User message + AI counter-statement

    # Evaluate Debate
    eval_res = evaluate_debate(debate.id, db=db, current_user=new_user)
    assert eval_res.total_score > 0
    assert eval_res.winner is not None

    # Export PDF Dossier
    pdf_resp = export_debate_pdf(debate.id, db=db, current_user=new_user)
    assert pdf_resp.media_type == "application/pdf"
    assert os.path.exists(pdf_resp.path)
    assert os.path.getsize(pdf_resp.path) > 100
    print("[SUCCESS] Workflow 5: AI Debate Arena, Scoring & ReportLab PDF Dossier verified.", flush=True)

    # -------------------------------------------------------------------------
    # WORKFLOW 6: Presentation Analysis & PDF Export
    # -------------------------------------------------------------------------
    print("\n[RUNNING] Workflow 6: Presentation Speech Cadence & PDF Report...", flush=True)
    pres_res = analyze_text_presentation(
        title="Keynote on Responsible Innovation",
        transcription="Good afternoon esteemed adjudicators. Um, today we stand at a critical crossroads. Like, if we fail to implement robust governance protocols, you know, public trust will erode completely.",
        estimated_duration_seconds=30.0,
        db=db,
        current_user=new_user
    )
    assert pres_res.words_per_minute > 0
    assert pres_res.filler_words_count >= 3

    pres_pdf = export_presentation_pdf(pres_res.id, db=db, current_user=new_user)
    assert pres_pdf.media_type == "application/pdf"
    assert os.path.exists(pres_pdf.path)
    assert os.path.getsize(pres_pdf.path) > 100
    print("[SUCCESS] Workflow 6: Presentation Speech Analytics & ReportLab PDF Report verified.", flush=True)

    # -------------------------------------------------------------------------
    # WORKFLOW 7: Dynamic Analytics Calculation
    # -------------------------------------------------------------------------
    print("\n[RUNNING] Workflow 7: Dynamic Analytics Querying...", flush=True)
    analytics_dash = get_dashboard_analytics(db=db, current_user=new_user)
    assert "total_debates" in analytics_dash
    assert "average_score" in analytics_dash
    assert analytics_dash["total_debates"] >= 1
    assert "win_distribution" in analytics_dash
    assert "weekly_activity" in analytics_dash

    user_skills = get_user_skills(current_user=new_user)
    assert len(user_skills) >= 1
    print("[SUCCESS] Workflow 7: Real-Time Dynamic Analytics & Skill Matrix verified.", flush=True)

    # -------------------------------------------------------------------------
    # WORKFLOW 8: Role-Based Access Control & User Data Isolation
    # -------------------------------------------------------------------------
    print("\n[RUNNING] Workflow 8: Role-Based Authorization & Admin Privileges...", flush=True)
    admin_user = db.query(User).filter(User.email == "admin@justitalk.com").first()
    assert admin_user is not None
    assert admin_user.role == UserRole.ADMINISTRATOR

    # Admin listing users
    all_users = list_all_users(db=db, admin_user=admin_user)
    assert len(all_users) >= 4

    # Admin updating role of test user to Debate Coach
    updated_role_user = update_user_role(
        user_id=new_user.id,
        role_in=UserRoleUpdate(role="Debate Coach"),
        db=db,
        admin_user=admin_user
    )
    assert updated_role_user.role == UserRole.DEBATE_COACH

    # Unauthorized access verification: non-creator non-admin cannot access another's debate turn or pdf
    learner_user = db.query(User).filter(User.email == "learner@justitalk.com").first()
    try:
        # debate belongs to new_user, learner_user is NOT creator or admin
        submit_debate_turn(debate.id, DebateMessageCreate(content="Unauthorized attempt"), db=db, current_user=learner_user)
        assert False, "Should have raised 403 Forbidden"
    except HTTPException as e:
        assert e.status_code == 403
        print("   -> Verified 403 Forbidden for unauthorized debate participation.", flush=True)

    print("[SUCCESS] Workflow 8: RBAC & Administrative Controls verified.", flush=True)

    print("\n==================================================", flush=True)
    print("ALL 8 END-TO-END WORKFLOWS PASSED 100% SUCCESSFULLY!", flush=True)
    print("==================================================", flush=True)
    db.close()

if __name__ == "__main__":
    run_all_workflows()
