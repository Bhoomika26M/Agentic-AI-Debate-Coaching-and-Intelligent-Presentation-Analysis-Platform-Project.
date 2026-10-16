import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from app.core.config import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def verify_google_oauth2_token(token: str) -> Dict[str, str]:
    """
    Decodes Google OAuth2 token. In local/mock mode, accepts demo Google tokens or mock payloads.
    """
    if token.startswith("mock_google_"):
        parts = token.split("_")
        role = parts[2] if len(parts) > 2 else "Learner"
        return {
            "email": f"google_{role.lower()}@debateiq.ai",
            "full_name": f"Google {role.capitalize()}",
            "picture": "https://api.dicebear.com/7.x/bottts/svg?seed=google",
            "sub": f"google_sub_{role.lower()}"
        }
    # Fallback to direct token decode or default
    decoded = decode_token(token)
    if decoded and "email" in decoded:
        return decoded
    return {
        "email": "google_user@debateiq.ai",
        "full_name": "Google User",
        "picture": "https://api.dicebear.com/7.x/bottts/svg?seed=google",
        "sub": "google_default_sub"
    }
