from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError
from pymongo.database import Database
from app.database.database import get_db
from app.database.helpers import public_user
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import UserRole
from app.schemas.user import UserPublic, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=list[UserPublic])
def list_users(user: dict = Depends(require_roles(UserRole.ADMINISTRATOR)), database: Database = Depends(get_db)) -> list[dict]:
    return [public_user(doc) for doc in database.users.find().sort("created_at", 1)]

@router.get("/me", response_model=UserPublic)
def get_me(user: dict = Depends(get_current_user)) -> dict:
    return public_user(user)

@router.put("/me", response_model=UserPublic)
def update_me(payload: UserUpdate, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes:
        changes["name"] = changes["name"].strip()
    if "email" in changes:
        changes["email"] = str(changes["email"]).lower()
    if changes:
        changes["updated_at"] = datetime.now(UTC)
        try:
            database.users.update_one({"_id": user["_id"]}, {"$set": changes})
        except DuplicateKeyError as error:
            raise HTTPException(status_code=409, detail="An account with this email already exists") from error
    return public_user(database.users.find_one({"_id": user["_id"]}))
