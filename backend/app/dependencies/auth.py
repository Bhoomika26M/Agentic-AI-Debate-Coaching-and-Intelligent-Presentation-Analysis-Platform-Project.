from collections.abc import Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pymongo.database import Database
from app.core.security import decode_access_token
from app.database.database import get_db
from app.models.user import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), database: Database = Depends(get_db)) -> dict:
    error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token", headers={"WWW-Authenticate": "Bearer"})
    try:
        from bson import ObjectId
        user_id = ObjectId(decode_access_token(token))
    except (TypeError, ValueError):
        raise error
    user = database.users.find_one({"_id": user_id})
    if user is None:
        raise error
    return user

def require_roles(*roles: UserRole) -> Callable:
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your role is not authorized for this action")
        return current_user
    return dependency
