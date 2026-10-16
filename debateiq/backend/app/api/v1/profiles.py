from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_roles
from app.repositories.user_repo import UserRepository
from app.models.user import User, UserRole
from app.schemas.profile import (
    ProfileUpdate,
    ProfileResponse,
    SkillUpdate,
    SkillResponse,
    GoalCreate,
    GoalUpdate,
    GoalResponse,
)

router = APIRouter(tags=["Profiles & Skills"])

@router.get("/profiles/me", response_model=ProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    repo = UserRepository(db)
    profile = repo.get_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile

@router.put("/profiles/me", response_model=ProfileResponse)
def update_my_profile(
    req: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db)
    updated = repo.update_profile(current_user.id, req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return updated

@router.get("/skills/me", response_model=SkillResponse)
def get_my_skills(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    repo = UserRepository(db)
    skills = repo.get_skills(current_user.id)
    if not skills:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skills record not found.")
    return skills

@router.put("/skills/me", response_model=SkillResponse)
def update_my_skills(
    req: SkillUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db)
    updated = repo.update_skills(current_user.id, req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skills record not found.")
    return updated

@router.post("/skills/{user_id}/recalibrate", response_model=SkillResponse)
def recalibrate_student_skills(
    user_id: str,
    req: SkillUpdate,
    current_user: User = Depends(require_roles(UserRole.COACH, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db)
    updated = repo.update_skills(user_id, req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skills record not found.")
    return updated

@router.get("/goals", response_model=List[GoalResponse])
def list_my_goals(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    repo = UserRepository(db)
    return repo.list_goals(current_user.id)

@router.post("/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    req: GoalCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db)
    return repo.create_goal(
        user_id=current_user.id,
        title=req.title,
        description=req.description,
        target_score=req.target_score or 85.0,
        category=req.category,
    )

@router.patch("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: str,
    req: GoalUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db)
    updated = repo.update_goal(goal_id, req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    return updated

@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db)
    success = repo.delete_goal(goal_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    return {"status": "success", "message": "Goal deleted."}
