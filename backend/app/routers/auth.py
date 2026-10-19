from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserProfile
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut, ProfileUpdate
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role="learner",  # NEVER allow self-registration as admin
    )
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id))
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)

@router.put("/profile")
def update_profile(payload: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)
    if payload.full_name:
        user.full_name = payload.full_name
    if payload.experience_level:
        profile.experience_level = payload.experience_level
    if payload.preferred_topics is not None:
        profile.preferred_topics = payload.preferred_topics
    if payload.presentation_domains is not None:
        profile.presentation_domains = payload.presentation_domains
    if payload.learning_goals is not None:
        profile.learning_goals = payload.learning_goals
    if payload.coaching_preferences is not None:
        profile.coaching_preferences = payload.coaching_preferences
    db.commit()
    return {"message": "Profile updated"}

@router.get("/profile")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    return {
        "user": UserOut.model_validate(user),
        "profile": {
            "experience_level": profile.experience_level if profile else "beginner",
            "preferred_topics": profile.preferred_topics if profile else [],
            "presentation_domains": profile.presentation_domains if profile else [],
            "learning_goals": profile.learning_goals if profile else [],
            "coaching_preferences": profile.coaching_preferences if profile else {},
        },
    }

from app.schemas.auth import AdminCreateUser
from app.core.deps import require_role

@router.post("/admin/users", response_model=UserOut, status_code=201)
def admin_create_user(
    payload: AdminCreateUser,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Only admins can create coach/educator/admin accounts."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id))
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)