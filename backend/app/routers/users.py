from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserRoleUpdate, UserUpdate
from app.services.auth_service import get_current_user, require_administrator


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(payload: UserUpdate, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    current_user.name = payload.name.strip()
    database.commit()
    database.refresh(current_user)
    return current_user


@router.get("", response_model=list[UserResponse])
def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    if current_user.role not in {"administrator", "educator", "debate_coach"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to view user directory")
    return (
        database.query(User)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_db),
):
    if current_user.role != "administrator" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    user = database.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    current_user: User = Depends(require_administrator),
    database: Session = Depends(get_db),
):
    user = database.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    database.commit()
    database.refresh(user)
    return user
