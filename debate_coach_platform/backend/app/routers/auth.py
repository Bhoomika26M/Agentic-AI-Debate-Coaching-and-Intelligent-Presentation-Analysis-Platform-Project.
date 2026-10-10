from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.profile import Profile, UserSkill
from app.schemas.auth import Token, LoginRequest, RegisterRequest
from app.security.hashing import hash_password, verify_password
from app.security.jwt import create_access_token
from app.security.rbac import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    # Validate role
    if request.role and request.role not in UserRole.ALL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{request.role}'. Valid roles are: {', '.join(UserRole.ALL)}"
        )
    
    # Check existing email
    existing_user = db.query(User).filter(User.email == request.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )
    
    # Create user
    new_user = User(
        email=request.email.lower(),
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        role=request.role or UserRole.LEARNER
    )
    db.add(new_user)
    db.flush()

    # Automatically initialize Profile
    default_profile = Profile(
        user_id=new_user.id,
        experience_level="Novice",
        preferred_topics=["Ethics", "AI & Technology"],
        presentation_domains=["Competitive Debate", "Pitch"],
        learning_goals="Build rigorous argumentation and eliminate logical fallacies.",
        coaching_preferences="Socratic & Constructive",
        bio="Aspiring debater aiming to enhance persuasive rhetoric and structured presentation delivery."
    )
    db.add(default_profile)

    # Automatically initialize User Skills
    default_skills = UserSkill(
        user_id=new_user.id,
        argument_quality=55.0,
        evidence_usage=50.0,
        logical_consistency=52.0,
        rebuttal_effectiveness=48.0,
        communication_skills=54.0,
        speech_pace_wpm=135.0,
        confidence_score=60.0,
        debates_completed=0
    )
    db.add(default_skills)

    db.commit()
    db.refresh(new_user)

    # Generate token
    token = create_access_token(data={"sub": new_user.id, "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": new_user.role,
        "user_id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email
    }


@router.post("/login", response_model=Token)
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently deactivated"
        )
    
    token = create_access_token(data={"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email
    }


@router.post("/token", response_model=Token)
def login_for_oauth2(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 specification uses 'username' field for email
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = create_access_token(data={"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email
    }


@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }
