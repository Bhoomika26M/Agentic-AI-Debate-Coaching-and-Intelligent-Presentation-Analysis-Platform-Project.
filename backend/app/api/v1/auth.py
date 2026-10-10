from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from jose import JWTError

from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.rate_limit import login_limiter
from app.db.session import get_db
from app.models.models import User, Profile
from app.models.enums import UserRole, ExperienceLevel
from app.schemas.user import (
    UserCreate,
    LoginRequest,
    GoogleLoginRequest,
    Token,
    UserWithProfileResponse,
)
from app.api.deps import get_current_user

router = APIRouter()

def set_refresh_cookie(response: Response, refresh_token: str):
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=max_age,
        expires=max_age,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
        path="/api/v1/auth"
    )

@router.post("/register", response_model=UserWithProfileResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account with default profile."""
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Create User
    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role or UserRole.LEARNER,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create associated Profile
    profile = Profile(
        user_id=user.id,
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user.id}",
        bio="",
        experience_level=ExperienceLevel.BEGINNER,
        preferred_topics=[],
        presentation_domains=[],
        coaching_style="Constructive & Formative",
        learning_goals=""
    )
    db.add(profile)
    await db.commit()
    await db.refresh(user)

    # Reload with profile
    stmt = select(User).options(selectinload(User.profile)).where(User.id == user.id)
    res = await db.execute(stmt)
    return res.scalars().first()


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with email and password, setting refresh token in httpOnly cookie."""
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{login_data.email}"
    login_limiter.check(rate_limit_key)

    stmt = select(User).where(User.email == login_data.email)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not user.password_hash or not verify_password(login_data.password, user.password_hash):
        login_limiter.record_failure(rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )

    login_limiter.reset(rate_limit_key)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    set_refresh_cookie(response, refresh_token)

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    response: Response,
    request: Request,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    """Obtain a new access token using httpOnly refresh token cookie."""
    token = refresh_token
    # Fallback to header if provided
    if not token and "x-refresh-token" in request.headers:
        token = request.headers["x-refresh-token"]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing from cookie or header"
        )

    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired or invalid refresh token"
        )

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Issue new token pair
    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)
    set_refresh_cookie(response, new_refresh)

    return Token(
        access_token=new_access,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear httpOnly refresh token cookie."""
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return {"message": "Successfully logged out"}


@router.post("/google", response_model=Token)
async def google_login(
    payload: GoogleLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Google OAuth2 login handler with email auto-provisioning."""
    # In production, verify Google ID token using google-auth or authlib
    # For Milestone 1 development & testing, extract or mock user info safely
    email = "google_user@arena.ai"
    full_name = "Google User"
    
    # If credential payload provides structured test email
    if "@" in payload.credential:
        email = payload.credential.strip()
        full_name = email.split("@")[0].replace(".", " ").title()

    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        user = User(
            email=email,
            password_hash=None,
            full_name=full_name,
            role=UserRole.LEARNER,
            oauth_provider="google",
            is_active=True
        )
        db.add(user)
        await db.flush()

        profile = Profile(
            user_id=user.id,
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user.id}",
            bio="",
            experience_level=ExperienceLevel.BEGINNER,
            preferred_topics=[],
            presentation_domains=[],
            coaching_style="Constructive & Formative",
            learning_goals=""
        )
        db.add(profile)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    set_refresh_cookie(response, refresh_token)

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserWithProfileResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the profile and role details of currently authenticated user."""
    return current_user
