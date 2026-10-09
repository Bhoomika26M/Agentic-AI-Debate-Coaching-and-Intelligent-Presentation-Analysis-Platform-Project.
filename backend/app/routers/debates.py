from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError
from pymongo.database import Database
from app.database.database import get_db
from app.database.helpers import oid, public_doc, public_user
from app.dependencies.auth import get_current_user
from app.models.debate import DebatePosition, DebateStatus
from app.models.user import UserRole
from app.schemas.debate import DebateCreate, DebateRead, DebateUpdate, ParticipantCreate, ParticipantRead

router = APIRouter(prefix="/api/debates", tags=["debates"])

def _debate(db, doc):
    result = public_doc(doc)
    result["created_by"] = str(doc["created_by"])
    result["creator"] = public_user(db.users.find_one({"_id": doc["created_by"]}))
    participants = []
    for item in db.participants.find({"debate_id": doc["_id"]}).sort("joined_at", 1):
        p = public_doc(item)
        p["debate_id"], p["user_id"] = str(item["debate_id"]), str(item["user_id"])
        p["user"] = public_user(db.users.find_one({"_id": item["user_id"]}))
        participants.append(p)
    result["participants"] = participants
    return result

def _find(db, debate_id):
    try:
        return db.debates.find_one({"_id": oid(debate_id)})
    except ValueError:
        return None

@router.post("", response_model=DebateRead, status_code=201)
def create_debate(payload: DebateCreate, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    now = datetime.now(UTC)
    doc = {**payload.model_dump(), "format": payload.format.value, "status": DebateStatus.SCHEDULED.value, "created_by": user["_id"], "created_at": now, "updated_at": now}
    result = database.debates.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _debate(database, doc)

@router.get("", response_model=list[DebateRead])
def list_debates(database: Database = Depends(get_db), user: dict = Depends(get_current_user)) -> list[dict]:
    return [_debate(database, d) for d in database.debates.find().sort("scheduled_at", 1)]

@router.get("/{debate_id}", response_model=DebateRead)
def get_debate(debate_id: str, database: Database = Depends(get_db), user: dict = Depends(get_current_user)) -> dict:
    debate = _find(database, debate_id)
    if debate is None: raise HTTPException(404, "Debate session not found")
    return _debate(database, debate)

def can_manage(debate, user): return debate["created_by"] == user["_id"] or user["role"] == UserRole.ADMINISTRATOR

@router.put("/{debate_id}", response_model=DebateRead)
def update_debate(debate_id: str, payload: DebateUpdate, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    debate = _find(database, debate_id)
    if debate is None: raise HTTPException(404, "Debate session not found")
    if not can_manage(debate, user): raise HTTPException(403, "Only the debate creator or an administrator can update this debate")
    changes = payload.model_dump(exclude_unset=True)
    if "format" in changes: changes["format"] = changes["format"].value
    changes["updated_at"] = datetime.now(UTC)
    database.debates.update_one({"_id": debate["_id"]}, {"$set": changes})
    return _debate(database, database.debates.find_one({"_id": debate["_id"]}))

@router.delete("/{debate_id}", status_code=204)
def delete_debate(debate_id: str, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> None:
    debate = _find(database, debate_id)
    if debate is None: raise HTTPException(404, "Debate session not found")
    if not can_manage(debate, user): raise HTTPException(403, "Only the debate creator or an administrator can delete this debate")
    database.debates.delete_one({"_id": debate["_id"]})
    database.participants.delete_many({"debate_id": debate["_id"]})

@router.post("/{debate_id}/join", response_model=ParticipantRead, status_code=201)
def join_debate(debate_id: str, payload: ParticipantCreate | None = None, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> dict:
    debate = _find(database, debate_id)
    if debate is None: raise HTTPException(404, "Debate session not found")
    if debate["status"] in (DebateStatus.COMPLETED, DebateStatus.CANCELLED): raise HTTPException(400, "This debate is no longer accepting participants")
    participant = {"debate_id": debate["_id"], "user_id": user["_id"], "position": (payload.position if payload else DebatePosition.NEUTRAL).value, "joined_at": datetime.now(UTC)}
    try: result = database.participants.insert_one(participant)
    except DuplicateKeyError as error: raise HTTPException(409, "You have already joined this debate") from error
    participant["_id"] = result.inserted_id
    result = public_doc(participant)
    result.update({"debate_id": debate_id, "user_id": str(user["_id"]), "user": public_user(user)})
    return result

@router.get("/{debate_id}/participants", response_model=list[ParticipantRead])
def list_participants(debate_id: str, user: dict = Depends(get_current_user), database: Database = Depends(get_db)) -> list[dict]:
    debate = _find(database, debate_id)
    if debate is None: raise HTTPException(404, "Debate session not found")
    result = []
    for p in database.participants.find({"debate_id": debate["_id"]}):
        item = public_doc(p)
        item.update({"debate_id": debate_id, "user_id": str(p["user_id"]), "user": public_user(database.users.find_one({"_id": p["user_id"]}))})
        result.append(item)
    return result
