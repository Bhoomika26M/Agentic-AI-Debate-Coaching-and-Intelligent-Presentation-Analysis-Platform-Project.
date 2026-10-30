from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.skill import Skill
from app.models.user import User
from app.schemas.learning_path import LearningPathResponse
from app.schemas.skill import SkillResponse, SkillUpdate
from app.services.auth_service import get_current_user
from app.services.learning_path_service import generate_user_learning_path
from app.services.notification_service import notify_skill_milestone
from app.services.skill_service import calculate_user_skills, sync_user_skills

router = APIRouter(prefix="/skills", tags=["skills"])


def get_or_create_skill(database: Session, user_id: int) -> Skill:
    skill = database.query(Skill).filter(Skill.user_id == user_id).first()
    if skill is None:
        skill = Skill(user_id=user_id)
        database.add(skill)
        database.commit()
        database.refresh(skill)
    return skill


@router.get("/me", response_model=SkillResponse)
def get_skill(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    skill = sync_user_skills(database, current_user.id)
    calc = calculate_user_skills(database, current_user.id)

    return SkillResponse(
        id=skill.id,
        user_id=skill.user_id,
        communication_score=skill.communication_score,
        critical_thinking_score=skill.critical_thinking_score,
        argumentation_score=skill.argumentation_score,
        confidence_score=skill.confidence_score,
        presentation_score=skill.presentation_score,
        updated_at=skill.updated_at,
        has_activity=calc["has_activity"],
        provenance=calc["provenance"],
    )


@router.post("/sync", response_model=SkillResponse)
def trigger_skill_sync(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    skill = sync_user_skills(database, current_user.id)
    calc = calculate_user_skills(database, current_user.id)
    return SkillResponse(
        id=skill.id,
        user_id=skill.user_id,
        communication_score=skill.communication_score,
        critical_thinking_score=skill.critical_thinking_score,
        argumentation_score=skill.argumentation_score,
        confidence_score=skill.confidence_score,
        presentation_score=skill.presentation_score,
        updated_at=skill.updated_at,
        has_activity=calc["has_activity"],
        provenance=calc["provenance"],
    )


@router.get("/learning-path", response_model=LearningPathResponse)
def get_learning_path(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    return generate_user_learning_path(database, current_user.id)


@router.get("", response_model=list[SkillResponse])
def list_skills(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    skills = database.query(Skill).filter(Skill.user_id == current_user.id).all()
    if not skills:
        return []
    calc = calculate_user_skills(database, current_user.id)
    return [
        SkillResponse(
            id=s.id,
            user_id=s.user_id,
            communication_score=s.communication_score,
            critical_thinking_score=s.critical_thinking_score,
            argumentation_score=s.argumentation_score,
            confidence_score=s.confidence_score,
            presentation_score=s.presentation_score,
            updated_at=s.updated_at,
            has_activity=calc["has_activity"],
            provenance=calc["provenance"],
        )
        for s in skills
    ]


@router.put("/me", response_model=SkillResponse)
def update_skill(payload: SkillUpdate, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    """
    Manual baseline overrides are removed to maintain performance-based competency integrity.
    Always synchronizes from verified assessment performance records.
    """
    skill = sync_user_skills(database, current_user.id)
    calc = calculate_user_skills(database, current_user.id)
    return SkillResponse(
        id=skill.id,
        user_id=skill.user_id,
        communication_score=skill.communication_score,
        critical_thinking_score=skill.critical_thinking_score,
        argumentation_score=skill.argumentation_score,
        confidence_score=skill.confidence_score,
        presentation_score=skill.presentation_score,
        updated_at=skill.updated_at,
        has_activity=calc["has_activity"],
        provenance=calc["provenance"],
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    skill = database.query(Skill).filter(Skill.user_id == current_user.id).first()
    if skill is not None:
        database.delete(skill)
        database.commit()
