from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserRead, UserUpdate
from app.security.rbac import get_current_active_user, require_roles

router = APIRouter(prefix="/users", tags=["User Directory & Role Administration"])

@router.get("", response_model=List[UserRead])
def list_platform_users(
    current_user: User = Depends(require_roles(UserRole.COACH, UserRole.EDUCATOR, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.patch("/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: str,
    updates: UserUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if updates.role:
        if updates.role not in UserRole.ALL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(UserRole.ALL)}"
            )
        user.role = updates.role
    
    if updates.full_name:
        user.full_name = updates.full_name
    if updates.is_active is not None:
        user.is_active = updates.is_active
        
    db.commit()
    db.refresh(user)
    return user
