from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.coaching_service import CoachingService
from app.schemas.coaching import (
    DrillRecommendation,
    LearningPlanCreate,
    LearningPlanResponse,
    CoachingFeedbackResponse,
)

router = APIRouter(prefix="/coaching", tags=["Coaching & Learning Plans"])

@router.get("/drills", response_model=List[DrillRecommendation])
def list_drills(db: Session = Depends(get_db)):
    service = CoachingService(db)
    return service.get_drills()

@router.get("/plans", response_model=List[LearningPlanResponse])
def list_my_plans(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = CoachingService(db)
    return service.list_plans(user_id=current_user.id)

@router.post("/plans", response_model=LearningPlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    req: LearningPlanCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = CoachingService(db)
    return service.create_plan(
        user_id=current_user.id,
        title=req.title,
        target_skill=req.target_skill,
        focus_areas=req.focus_areas,
        milestone_goals=req.milestone_goals,
    )

@router.get("/recommendations", response_model=CoachingFeedbackResponse)
def get_recommendations(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    service = CoachingService(db)
    return service.get_recommendations(user_id=current_user.id)
