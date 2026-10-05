from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .models import User

# PBKDF2 avoids native bcrypt version differences while remaining portable.
pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def hash_password(value: str) -> str:
    return pwd.hash(value)


def verify_password(value: str, hashed: str) -> bool:
    return pwd.verify(value, hashed)


def make_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expires}, settings.secret_key, algorithm="HS256")


def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    try:
        user_id = int(jwt.decode(token, settings.secret_key, algorithms=["HS256"]).get("sub", ""))
    except (JWTError, ValueError):
        raise error
    user = db.get(User, user_id)
    if not user:
        raise error
    return user


def require_roles(*roles):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return dependency
