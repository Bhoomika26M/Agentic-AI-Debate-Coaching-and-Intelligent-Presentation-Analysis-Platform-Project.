from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_roles
from app.repositories.user_repo import UserRepository
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, RoleUpdateRequest

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def list_users(
    role: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(require_roles(UserRole.COACH, UserRole.EDUCATOR, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db)
    return repo.list_users(limit=limit, role=role)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    req: RoleUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    if req.role not in UserRole.ALL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role. Allowed: {UserRole.ALL}")
    repo = UserRepository(db)
    updated = repo.update_role(user_id, req.role)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return updated
