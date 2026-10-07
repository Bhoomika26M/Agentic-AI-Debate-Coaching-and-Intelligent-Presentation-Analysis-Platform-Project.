from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import UserRegister, UserOut, TokenOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user and return a JWT token."""
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    default_skills = {
        "clarity_score": 75,
        "relevance_score": 78,
        "evidence_strength": 70,
        "logical_consistency": 72,
        "persuasiveness": 74,
        "speaking_pace": 135,
        "confidence_score": 80,
        "filler_word_rate": 2.5,
    }

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        experience_level="Beginner",
        debate_topics=["Technology & AI", "Climate & Environment", "Philosophy & Ethics"],
        presentation_domains=["Public Speaking & Keynote", "Academic & Research"],
        learning_goals=["Improve argument structure", "Reduce filler words", "Build confidence"],
        coaching_prefs=["Detailed feedback", "AI simulation"],
        communication_skills=default_skills,
        presentation_history=[],
        total_sessions=0,
        avg_score=75.0,
        win_streak=0,
    )
    db.add(user)
    await db.flush()  # get user.id before commit

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login with email + password (OAuth2 form). Returns JWT token."""
    user = await get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated.")

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))
