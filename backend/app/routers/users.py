from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserProfile, UserSkill
from app.schemas.user import UserOut, UserProfileUpdate, UserSkillOut
from typing import List

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/profile", response_model=UserOut)
def get_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserOut)
def update_user_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
    if profile_in.bio is not None:
        profile.bio = profile_in.bio
    if profile_in.institution is not None:
        profile.institution = profile_in.institution
    if profile_in.experience_level is not None:
        profile.experience_level = profile_in.experience_level
    if profile_in.preferred_debate_topics is not None:
        profile.preferred_debate_topics = profile_in.preferred_debate_topics
    if profile_in.presentation_domains is not None:
        profile.presentation_domains = profile_in.presentation_domains
    if profile_in.learning_goals is not None:
        profile.learning_goals = profile_in.learning_goals
    if profile_in.coaching_preferences is not None:
        profile.coaching_preferences = profile_in.coaching_preferences

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/skills", response_model=List[UserSkillOut])
def get_user_skills(current_user: User = Depends(get_current_user)):
    return current_user.skills
