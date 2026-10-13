from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.profile import UserProfile, LearningGoal
from app.schemas.profile import (
    ProfileUpdate, ProfileRead,
    LearningGoalCreate, LearningGoalUpdate, LearningGoalRead,
)

router = APIRouter(prefix="/profiles", tags=["Profiles & Goals"])


# ─── Profile ──────────────────────────────────────────────────────────────────

@router.get("/me", response_model=ProfileRead)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get or auto-create the current user's profile."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


@router.put("/me", response_model=ProfileRead)
async def update_my_profile(
    body: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the current user's profile."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    profile.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(profile)
    return profile


# ─── Learning Goals ───────────────────────────────────────────────────────────

@router.get("/me/goals", response_model=list[LearningGoalRead])
async def list_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LearningGoal).where(LearningGoal.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/me/goals", response_model=LearningGoalRead, status_code=status.HTTP_201_CREATED)
async def create_goal(
    body: LearningGoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = LearningGoal(user_id=current_user.id, **body.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/me/goals/{goal_id}", response_model=LearningGoalRead)
async def update_goal(
    goal_id: UUID,
    body: LearningGoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LearningGoal).where(
            LearningGoal.id == goal_id,
            LearningGoal.user_id == current_user.id,
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    goal.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/me/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LearningGoal).where(
            LearningGoal.id == goal_id,
            LearningGoal.user_id == current_user.id,
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
