from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    update: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if update.experience_level is not None:
        current_user.experience_level = update.experience_level
    if update.preferred_topics is not None:
        current_user.preferred_topics = update.preferred_topics
    if update.learning_goals is not None:
        current_user.learning_goals = update.learning_goals
    db.commit()
    db.refresh(current_user)
    return current_user
