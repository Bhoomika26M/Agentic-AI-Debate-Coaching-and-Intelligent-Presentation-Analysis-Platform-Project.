from datetime import timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.user_repo import UserRepository
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_google_oauth2_token,
)
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.auth import Token

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def register(self, email: str, password: str, full_name: str, role: str = UserRole.LEARNER) -> Token:
        existing = self.user_repo.get_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )
        if role not in UserRole.ALL:
            role = UserRole.LEARNER

        user = self.user_repo.create_user(
            email=email,
            password=password,
            full_name=full_name,
            role=role,
        )
        return self._generate_tokens(user)

    def login(self, email: str, password: str) -> Token:
        user = self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is deactivated.",
            )
        return self._generate_tokens(user)

    def refresh(self, refresh_token: str) -> Token:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )
        user_id = payload.get("sub")
        user = self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User no longer exists or is inactive.",
            )
        return self._generate_tokens(user)

    def google_login(self, id_token: str, role_preference: str = UserRole.LEARNER) -> Token:
        oauth_data = verify_google_oauth2_token(id_token)
        email = oauth_data["email"]
        user = self.user_repo.get_by_email(email)
        if not user:
            user = self.user_repo.create_user(
                email=email,
                password="OAuth2_Verified_Password_Token",
                full_name=oauth_data.get("name", "Google User"),
                role=role_preference if role_preference in UserRole.ALL else UserRole.LEARNER,
                avatar_url=oauth_data.get("picture"),
            )
        return self._generate_tokens(user)

    def _generate_tokens(self, user: User) -> Token:
        access_token_data = {"sub": user.id, "email": user.email, "role": user.role, "type": "access"}
        refresh_token_data = {"sub": user.id, "type": "refresh"}

        access_token = create_access_token(access_token_data)
        refresh_token = create_refresh_token(refresh_token_data)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
