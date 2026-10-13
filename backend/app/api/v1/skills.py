from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import User, Skill, UserSkill
from app.models.enums import SkillCategory
from app.schemas.profile_skill_goal import SkillResponse, UserSkillResponse, UserSkillUpdate
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[SkillResponse])
async def list_skills(
    category: Optional[SkillCategory] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all available debate skills with optional category filter."""
    query = select(Skill)
    if category:
        query = query.where(Skill.category == category)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/me", response_model=List[UserSkillResponse])
async def get_my_skills(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve skill mastery levels for the currently logged-in user."""
    stmt = (
        select(UserSkill)
        .options(selectinload(UserSkill.skill))
        .where(UserSkill.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    user_skills = result.scalars().all()

    return [
        UserSkillResponse(
            skill_id=us.skill_id,
            skill_name=us.skill.name,
            category=us.skill.category,
            level=us.level,
            updated_at=us.updated_at
        )
        for us in user_skills
    ]

@router.put("/me", response_model=UserSkillResponse)
async def update_my_skill(
    skill_update: UserSkillUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update or insert a skill level (0-100) for the current user."""
    # Verify skill exists
    skill = await db.get(Skill, skill_update.skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    user_skill = await db.get(UserSkill, (current_user.id, skill.id))
    if not user_skill:
        user_skill = UserSkill(
            user_id=current_user.id,
            skill_id=skill.id,
            level=skill_update.level,
            updated_at=datetime.utcnow()
        )
        db.add(user_skill)
    else:
        user_skill.level = skill_update.level
        user_skill.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user_skill)

    return UserSkillResponse(
        skill_id=skill.id,
        skill_name=skill.name,
        category=skill.category,
        level=user_skill.level,
        updated_at=user_skill.updated_at
    )