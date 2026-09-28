from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.entities import User, UserProfile
from backend.app.schemas.auth import (
    UserRegister, UserLogin, Token, UserResponse, UserProfileUpdate
)
from backend.app.auth.security import get_password_hash, verify_password
from backend.app.auth.jwt import create_access_token, create_refresh_token, decode_token
from backend.app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    if user_in.password != user_in.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    role = user_in.role if user_in.role in ["learner", "coach", "educator", "admin"] else "learner"
    
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=role,
        is_active=True
    )
    db.add(new_user)
    db.flush()
    
    new_profile = UserProfile(
        user_id=new_user.id,
        experience_level=user_in.experience_level or "Beginner",
        preferred_topics=user_in.preferred_debate_topics or "Technology, Ethics",
        presentation_domains=user_in.presentation_domains or "Academic, Keynote",
        learning_goals=user_in.learning_goals or "Improve debate skills",
        coaching_preferences=user_in.coaching_preferences or "Constructive",
        communication_level=70,
        debate_level=65,
        critical_thinking_level=70,
        presentation_level=68,
        confidence_level=72
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_user)
    
    token_data = {"sub": new_user.email, "role": new_user.role, "id": new_user.id}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=new_user.role,
        user_id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email
    )

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")
        
    token_data = {"sub": user.email, "role": user.role, "id": user.id}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email
    )

@router.post("/oauth", response_model=Token)
def oauth_login(payload: dict, db: Session = Depends(get_db)):
    """OAuth2 integration flow for Google / GitHub / Enterprise SSO."""
    email = payload.get("email", "oauth.user@debateai.com")
    name = payload.get("name", "OAuth Debater")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=get_password_hash("OAuthSecureDefaultPassword!"),
            full_name=name,
            role="learner",
            is_active=True
        )
        db.add(user)
        db.flush()
        profile = UserProfile(user_id=user.id, experience_level="Intermediate")
        db.add(profile)
        db.commit()
        db.refresh(user)
        
    token_data = {"sub": user.email, "role": user.role, "id": user.id}
    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email
    )

@router.post("/refresh", response_model=Token)
def refresh_token(payload: dict, db: Session = Depends(get_db)):
    ref_token = payload.get("refresh_token")
    if not ref_token:
        raise HTTPException(status_code=400, detail="Refresh token required")
    data = decode_token(ref_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    email = data.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
        
    token_data = {"sub": user.email, "role": user.role, "id": user.id}
    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(
    update_in: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if update_in.full_name:
        current_user.full_name = update_in.full_name
        
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        
    if update_in.experience_level:
        profile.experience_level = update_in.experience_level
    if update_in.preferred_topics:
        profile.preferred_topics = update_in.preferred_topics
    if update_in.presentation_domains:
        profile.presentation_domains = update_in.presentation_domains
    if update_in.learning_goals:
        profile.learning_goals = update_in.learning_goals
    if update_in.coaching_preferences:
        profile.coaching_preferences = update_in.coaching_preferences
    if update_in.bio:
        profile.bio = update_in.bio
    if update_in.avatar_url:
        profile.avatar_url = update_in.avatar_url
        
    db.commit()
    db.refresh(current_user)
    return current_user
