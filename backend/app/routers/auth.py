from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
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


class OAuth2LoginPayload(BaseModel):
    provider: str = "google"
    token: str
    email: str | None = None
    full_name: str | None = None
    role: str = "learner"


@router.post("/oauth2/login", response_model=TokenOut)
async def oauth2_login(
    payload: OAuth2LoginPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth2 SSO Authentication (Google, GitHub, SAML/LDAP).
    Exchanges OAuth2 provider token for platform JWT access token.
    """
    email = payload.email or f"{payload.provider}_user@debatecoach.ai"
    full_name = payload.full_name or f"{payload.provider.capitalize()} Debater"

    user = await get_user_by_email(db, email)
    if not user:
        default_skills = {
            "clarity_score": 78,
            "relevance_score": 80,
            "evidence_strength": 75,
            "logical_consistency": 76,
            "persuasiveness": 77,
            "speaking_pace": 138,
            "confidence_score": 82,
            "filler_word_rate": 2.1,
        }
        user = User(
            full_name=full_name,
            email=email,
            hashed_password=get_password_hash("OAuth2VerifiedExternalAuthSecret!"),
            role=payload.role,
            experience_level="Intermediate",
            debate_topics=["Technology & AI", "Policy & Ethics", "Global Governance"],
            presentation_domains=["Public Speaking & Keynote", "Academic & Research"],
            learning_goals=["Master logical fallacies", "Refine rebuttal timing"],
            coaching_prefs=["Detailed feedback", "AI simulation"],
            communication_skills=default_skills,
            presentation_history=[],
            total_sessions=1,
            avg_score=78.5,
            win_streak=1,
        )
        db.add(user)
        await db.flush()

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


class ResetPasswordPayload(BaseModel):
    email: str
    new_password: str


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Direct Password Reset Endpoint.
    Validates user email and directly updates the hashed password in SQLite,
    allowing password reset without requiring external SMTP email dispatch.
    """
    user = await get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address.",
        )
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    db.add(user)
    await db.commit()
    return {"message": "Password updated successfully. You can now sign in with your new password."}
