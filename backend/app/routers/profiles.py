from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.services.auth_service import get_current_user
from app.services.profile_service import get_or_create_profile


router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    return get_or_create_profile(database, current_user.id)


@router.put("/me", response_model=ProfileResponse)
def update_profile(payload: ProfileUpdate, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    profile = get_or_create_profile(database, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    database.commit()
    database.refresh(profile)
    return profile
