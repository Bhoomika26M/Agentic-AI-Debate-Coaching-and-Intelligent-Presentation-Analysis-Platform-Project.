from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.coaching import CoachingRecommendation
from app.schemas.coaching import CoachingRecommendationOut
from app.services.coaching_service import coaching_service

router = APIRouter(prefix="/coaching", tags=["Coaching & Recommendations"])

@router.get("/recommendations", response_model=List[CoachingRecommendationOut])
def get_coaching_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch existing recommendations or generate if empty
    recs = db.query(CoachingRecommendation).filter(
        CoachingRecommendation.user_id == current_user.id
    ).order_by(CoachingRecommendation.created_at.desc()).all()

    if not recs:
        recs = coaching_service.generate_recommendations_for_user(db, current_user)
    return recs

@router.post("/refresh", response_model=List[CoachingRecommendationOut])
def refresh_coaching_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return coaching_service.generate_recommendations_for_user(db, current_user)
