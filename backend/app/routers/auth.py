import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.timezone import ensure_utc
from app.core.security import (
    create_access_token,
    hash_password,
    hash_reset_token,
    normalize_email,
    validate_password_strength,
    verify_password,
)
from app.models.password_reset import PasswordResetToken
from app.models.profile import Profile
from app.models.user import User
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import get_current_user
from app.services.email_service import send_password_reset_email


router = APIRouter(prefix="/auth", tags=["authentication"])

RATE_LIMITS = {"login": defaultdict(list), "reset": defaultdict(list)}


def _rate_limit(window_key: str, action: str, limit: int, seconds: int) -> None:
    now = time.monotonic()
    attempts = RATE_LIMITS[action].get(window_key, [])
    attempts = [attempt for attempt in attempts if now - attempt < seconds]
    if len(attempts) >= limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please wait a moment and try again.")
    attempts.append(now)
    RATE_LIMITS[action][window_key] = attempts


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, database: Session = Depends(get_db)):
    normalized_email = normalize_email(payload.email)
    if database.query(User).filter(User.email == normalized_email).first():
        raise HTTPException(status_code=409, detail="Email is already registered")
    if not validate_password_strength(payload.password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters and include uppercase, lowercase, and a number.")

    # All new users are registered with the default 'learner' role.
    # Self-assignment of privileged roles (administrator, educator, debate_coach) during registration is strictly ignored and prevented.
    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=hash_password(payload.password),
        role="learner",
    )
    database.add(user)
    database.flush()

    profile = database.query(Profile).filter(Profile.user_id == user.id).first()
    if profile is None:
        database.add(Profile(user_id=user.id))

    database.commit()
    database.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, database: Session = Depends(get_db)):
    normalized_email = normalize_email(payload.email)
    client_key = request.client.host if request.client else "unknown"
    _rate_limit(f"{client_key}:{normalized_email}", "login", 5, 60)

    user = database.query(User).filter(User.email == normalized_email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, database: Session = Depends(get_db)):
    normalized_email = normalize_email(payload.email)
    client_key = request.client.host if request.client else "unknown"
    _rate_limit(f"{client_key}:{normalized_email}", "reset", 3, 300)

    user = database.query(User).filter(User.email == normalized_email).first()
    response = {"message": "If an account exists for that email address, a password reset link has been sent."}
    if user is None:
        return response

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_token_ttl_minutes)

    database.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    database.add(PasswordResetToken(user_id=user.id, token_hash=hash_reset_token(token), expires_at=expires_at))
    database.commit()

    debug_link = send_password_reset_email(user.email, token)
    if settings.environment == "development" and settings.password_reset_debug_mode and debug_link:
        response["debug_reset_url"] = debug_link
    return response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, database: Session = Depends(get_db)):
    if not validate_password_strength(payload.password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters and include uppercase, lowercase, and a number.")

    hashed_token = hash_reset_token(payload.token)
    record = database.query(PasswordResetToken).filter(PasswordResetToken.token_hash == hashed_token).first()
    if record is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has already been used.")
    if record.used_at is not None or ensure_utc(record.expires_at) < datetime.now(timezone.utc):
        record.used_at = record.used_at or datetime.now(timezone.utc)
        database.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired.")

    user = database.get(User, record.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has already been used.")

    user.password_hash = hash_password(payload.password)
    record.used_at = datetime.now(timezone.utc)
    database.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).filter(PasswordResetToken.id != record.id).delete()
    database.commit()
    return {"message": "Password reset successful."}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
