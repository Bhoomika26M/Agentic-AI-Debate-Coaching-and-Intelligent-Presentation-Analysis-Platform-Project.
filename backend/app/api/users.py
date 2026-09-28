from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.user import User, Profile
from ..schemas.user import User as UserSchema, Profile as ProfileSchema, ProfileCreate
from .deps import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.get("/me/profile", response_model=ProfileSchema)
def read_profile_me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.put("/me/profile", response_model=ProfileSchema)
def update_profile_me(
    profile_in: ProfileCreate, 
    current_user: User = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    for var, value in vars(profile_in).items():
        setattr(profile, var, value)
    
    db.commit()
    db.refresh(profile)
    return profile
