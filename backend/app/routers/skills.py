from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.skill import Skill
from app.models.user import User
from app.schemas.skill import SkillResponse, SkillUpdate
from app.services.auth_service import get_current_user


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
    return get_or_create_skill(database, current_user.id)


@router.get("", response_model=list[SkillResponse])
def list_skills(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    return database.query(Skill).filter(Skill.user_id == current_user.id).all()


@router.put("/me", response_model=SkillResponse)
def update_skill(payload: SkillUpdate, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    skill = get_or_create_skill(database, current_user.id)
    for field, value in payload.model_dump().items():
        setattr(skill, field, value)
    database.commit()
    database.refresh(skill)
    return skill


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    skill = database.query(Skill).filter(Skill.user_id == current_user.id).first()
    if skill is not None:
        database.delete(skill)
        database.commit()
