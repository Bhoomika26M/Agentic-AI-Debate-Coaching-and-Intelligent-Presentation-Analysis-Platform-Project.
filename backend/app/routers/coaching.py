from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserProfile
from app.models.analysis import PerformanceEvaluation, CoachingRecommendation
from app.core.deps import get_current_user
from app.services import gemini_service
from app.schemas.coaching import CoachingOut

router = APIRouter(prefix="/api/coaching", tags=["coaching"])

@router.post("/generate", response_model=CoachingOut)
def generate(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter_by(user_id=user.id).first()
    evals = db.query(PerformanceEvaluation).filter_by(user_id=user.id).order_by(
        PerformanceEvaluation.created_at.desc()).limit(10).all()

    profile_dict = {
        "experience_level": profile.experience_level if profile else "beginner",
        "learning_goals": profile.learning_goals if profile else [],
        "preferred_topics": profile.preferred_topics if profile else [],
    }
    eval_list = [{"score": e.overall_score,
                  "strengths": e.strengths, "weaknesses": e.weaknesses} for e in evals]

    try:
        result = gemini_service.generate_coaching(profile_dict, eval_list)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))

    rec = CoachingRecommendation(user_id=user.id, recommendations_json=result)
    db.add(rec); db.commit(); db.refresh(rec)
    return CoachingOut(
        id=rec.id,
        debate_exercises=result.get("debate_exercises", []),
        presentation_exercises=result.get("presentation_exercises", []),
        reasoning_practice=result.get("reasoning_practice", []),
        weekly_goals=result.get("weekly_goals", []),
        suggested_next=result.get("suggested_next", []),
        generated_at=rec.generated_at.isoformat(),
    )

@router.get("/latest", response_model=CoachingOut | None)
def latest(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(CoachingRecommendation).filter_by(user_id=user.id).order_by(
        CoachingRecommendation.generated_at.desc()).first()
    if not rec:
        return None
    r = rec.recommendations_json
    return CoachingOut(
        id=rec.id,
        debate_exercises=r.get("debate_exercises", []),
        presentation_exercises=r.get("presentation_exercises", []),
        reasoning_practice=r.get("reasoning_practice", []),
        weekly_goals=r.get("weekly_goals", []),
        suggested_next=r.get("suggested_next", []),
        generated_at=rec.generated_at.isoformat(),
    )