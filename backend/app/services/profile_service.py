from sqlalchemy.orm import Session

from app.models.profile import Profile


def get_or_create_profile(database: Session, user_id: int) -> Profile:
    profile = database.query(Profile).filter(Profile.user_id == user_id).first()
    if profile is None:
        profile = Profile(user_id=user_id)
        database.add(profile)
        database.commit()
        database.refresh(profile)
    return profile
