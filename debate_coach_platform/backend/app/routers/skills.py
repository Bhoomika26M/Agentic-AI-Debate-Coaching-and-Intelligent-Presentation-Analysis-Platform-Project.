from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.profile import UserSkill
from app.schemas.profile import UserSkillRead, UserSkillUpdate
from app.security.rbac import get_current_active_user, require_roles

router = APIRouter(prefix="/skills", tags=["Skill Tracking & Scoring"])

def calculate_overall_score(skill: UserSkill) -> float:
    """
    Weighted Scoring Model as specified:
    Argument Quality: 30%
    Evidence Usage: 20%
    Logical Consistency: 20%
    Rebuttal Effectiveness: 15%
    Communication Skills: 15%
    """
    weighted_score = (
        (skill.argument_quality * 0.30) +
        (skill.evidence_usage * 0.20) +
        (skill.logical_consistency * 0.20) +
        (skill.rebuttal_effectiveness * 0.15) +
        (skill.communication_skills * 0.15)
    )
    return round(weighted_score, 2)

@router.get("/me", response_model=UserSkillRead)
def get_my_skills(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    skill = db.query(UserSkill).filter(UserSkill.user_id == current_user.id).first()
    if not skill:
        skill = UserSkill(
            user_id=current_user.id,
            argument_quality=55.0,
            evidence_usage=50.0,
            logical_consistency=52.0,
            rebuttal_effectiveness=48.0,
            communication_skills=54.0,
            speech_pace_wpm=135.0,
            confidence_score=60.0,
            debates_completed=0
        )
        db.add(skill)
        db.commit()
        db.refresh(skill)
    
    score = calculate_overall_score(skill)
    # Attach computed field
    response = UserSkillRead.model_validate(skill)
    response.overall_performance_score = score
    return response

@router.put("/me", response_model=UserSkillRead)
def update_my_skills(
    updates: UserSkillUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    skill = db.query(UserSkill).filter(UserSkill.user_id == current_user.id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill record not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(skill, field, value)
    
    db.commit()
    db.refresh(skill)
    
    response = UserSkillRead.model_validate(skill)
    response.overall_performance_score = calculate_overall_score(skill)
    return response

@router.get("/{user_id}", response_model=UserSkillRead)
def get_user_skills_by_id(
    user_id: str,
    current_user: User = Depends(require_roles(UserRole.COACH, UserRole.EDUCATOR, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    skill = db.query(UserSkill).filter(UserSkill.user_id == user_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skills not found for specified user")
    
    response = UserSkillRead.model_validate(skill)
    response.overall_performance_score = calculate_overall_score(skill)
    return response

@router.post("/{user_id}/recalibrate", response_model=UserSkillRead)
def recalibrate_user_skills(
    user_id: str,
    updates: UserSkillUpdate,
    current_user: User = Depends(require_roles(UserRole.COACH, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Allows a Coach or Admin to adjust a student's skill metrics after a debate session."""
    skill = db.query(UserSkill).filter(UserSkill.user_id == user_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skills record not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(skill, field, value)
    
    db.commit()
    db.refresh(skill)
    
    response = UserSkillRead.model_validate(skill)
    response.overall_performance_score = calculate_overall_score(skill)
    return response
