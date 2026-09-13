from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), database: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub", ""))
    except (JWTError, ValueError, TypeError):
        raise credentials_error from None
    user = database.get(User, user_id)
    if user is None:
        raise credentials_error
    return user


def require_role(role: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return dependency


def require_learner(current_user: User = Depends(get_current_user)) -> User:
    return require_role("learner")(current_user)


def require_debate_coach(current_user: User = Depends(get_current_user)) -> User:
    return require_role("debate_coach")(current_user)


def require_educator(current_user: User = Depends(get_current_user)) -> User:
    return require_role("educator")(current_user)


def require_administrator(current_user: User = Depends(get_current_user)) -> User:
    return require_role("administrator")(current_user)
