
import re

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field, field_validator

from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_demo_user,
    create_user,
    get_user_from_token,
)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login"
)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address.")
        return value


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address.")
        return value


def current_user(token: str = Depends(oauth2_scheme)):
    return get_user_from_token(token)


@router.post("/register", status_code=201)
def register(data: RegisterRequest):
    user = create_user(data.email, data.password)
    token = create_access_token(user["id"], user["email"])

    return {
        "message": "Account created successfully.",
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/login")
def login(data: LoginRequest):
    # Local demo mode: no password or email ownership verification.
    user = create_demo_user(data.email)
    token = create_access_token(user["id"], user["email"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me")
def get_me(user=Depends(current_user)):
    return {"user": user}
