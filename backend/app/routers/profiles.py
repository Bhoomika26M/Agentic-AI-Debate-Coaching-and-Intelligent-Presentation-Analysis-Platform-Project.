from datetime import UTC, datetime
from fastapi import APIRouter, Depends
from pymongo.database import Database
from app.database.database import get_db
from app.database.helpers import public_doc
from app.dependencies.auth import get_current_user
from app.schemas.profile import ProfileRead, ProfileUpdate

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

def profile(database, user):
    now = datetime.now(UTC)
    database.profiles.update_one({"user_id": user["_id"]}, {"$setOnInsert": {"created_at": now}, "$set": {"updated_at": now}}, upsert=True)
    result = public_doc(database.profiles.find_one({"user_id": user["_id"]}))
    result["user_id"] = str(user["_id"])
    return result

@router.get("/me", response_model=ProfileRead)
def get_profile(user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    return profile(database, user)

@router.put("/me", response_model=ProfileRead)
def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    now = datetime.now(UTC)
    database.profiles.update_one({"user_id": user["_id"]}, {"$set": {**payload.model_dump(exclude_unset=True), "updated_at": now}, "$setOnInsert": {"created_at": now}}, upsert=True)
    return profile(database, user)
