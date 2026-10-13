from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.models import User, LearningGoal
from app.schemas.profile_skill_goal import GoalCreate, GoalUpdate, GoalResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[GoalResponse])
async def list_my_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all learning goals for the currently logged-in user."""
    stmt = select(LearningGoal).where(LearningGoal.user_id == current_user.id).order_by(LearningGoal.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_in: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new learning goal for the logged-in user."""
    goal = LearningGoal(
        user_id=current_user.id,
        title=goal_in.title,
        target_date=goal_in.target_date,
        status=goal_in.status,
        progress=goal_in.progress or 0
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal

@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal_in: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a learning goal belonging to the logged-in user."""
    goal = await db.get(LearningGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    if goal.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another user's goal")

    update_data = goal_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)

    await db.commit()
    await db.refresh(goal)
    return goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a learning goal belonging to the logged-in user."""
    goal = await db.get(LearningGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    if goal.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete another user's goal")

    await db.delete(goal)
    await db.commit()
    return None