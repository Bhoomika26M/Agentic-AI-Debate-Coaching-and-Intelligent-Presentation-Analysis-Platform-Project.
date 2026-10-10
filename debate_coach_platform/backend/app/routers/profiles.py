from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.schemas.profile import ProfileRead, ProfileUpdate
from app.security.rbac import get_current_active_user, require_roles

router = APIRouter(prefix="/profiles", tags=["User Profiles & Preferences"])

@router.get("/me", response_model=ProfileRead)
def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        # Fallback create if somehow missing
        profile = Profile(
            user_id=current_user.id,
            experience_level="Novice",
            preferred_topics=["Ethics", "AI & Technology"],
            presentation_domains=["Competitive Debate"],
            learning_goals="Improve argument depth and cross-examination precision.",
            coaching_preferences="Socratic & Constructive",
            bio=""
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/me", response_model=ProfileRead)
def update_my_profile(
    updates: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/{user_id}", response_model=ProfileRead)
def get_user_profile_by_id(
    user_id: str,
    current_user: User = Depends(require_roles(UserRole.COACH, UserRole.EDUCATOR, UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found for this user")
    return profile
