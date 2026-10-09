from datetime import UTC, datetime
from fastapi import APIRouter, Depends
from pymongo.database import Database
from app.database.database import get_db
from app.database.helpers import public_doc
from app.dependencies.auth import get_current_user
from app.schemas.skill import SkillRead, SkillUpdate

router = APIRouter(prefix="/api/skills", tags=["skills"])

@router.get("/me", response_model=SkillRead)
def get_skills(user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    now = datetime.now(UTC)
    database.skills.update_one({"user_id": user["_id"]}, {"$setOnInsert": {"communication_score": 0, "critical_thinking_score": 0, "debate_score": 0, "presentation_score": 0, "created_at": now}, "$set": {"updated_at": now}}, upsert=True)
    result = public_doc(database.skills.find_one({"user_id": user["_id"]}))
    result["user_id"] = str(user["_id"])
    return result

@router.put("/me", response_model=SkillRead)
def update_skills(payload: SkillUpdate, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    now = datetime.now(UTC)
    database.skills.update_one({"user_id": user["_id"]}, {"$set": {**payload.model_dump(), "updated_at": now}, "$setOnInsert": {"created_at": now}}, upsert=True)
    result = public_doc(database.skills.find_one({"user_id": user["_id"]}))
    result["user_id"] = str(user["_id"])
    return result
