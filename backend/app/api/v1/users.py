from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import User
from app.models.enums import UserRole
from app.schemas.user import UserResponse, UserUpdate, UserRoleUpdate, UserWithProfileResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("/", response_model=List[UserWithProfileResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[UserRole] = None,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only endpoint: list registered users with pagination and role filters."""
    query = select(User).options(selectinload(User.profile)).offset(skip).limit(limit)
    if role:
        query = query.where(User.role == role)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserWithProfileResponse)
async def get_user_by_id(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user details by ID. Any user can view other members; admins can view all."""
    stmt = select(User).options(selectinload(User.profile)).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user account. Users can update their own name/email; admins can update anyone."""
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update another user's profile"
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.email is not None:
        # Check uniqueness
        existing = await db.execute(select(User).where(User.email == user_update.email, User.id != user_id))
        if existing.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already taken")
        user.email = user_update.email
    if user_update.is_active is not None:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins can deactivate users")
        user.is_active = user_update.is_active
    if user_update.role is not None:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins can change roles")
        user.role = user_update.role

    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}/role", response_model=UserResponse)
async def change_user_role(
    user_id: str,
    role_in: UserRoleUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only endpoint: change user role."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = role_in.role
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=UserResponse)
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only endpoint: deactivate user."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return user
