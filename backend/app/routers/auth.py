from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError
from pymongo.database import Database
from app.core.security import create_access_token, hash_password, verify_password
from app.database.database import get_db
from app.database.helpers import public_doc, public_user
from app.dependencies.auth import get_current_user
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, database: Database = Depends(get_db)) -> dict:
    now = datetime.now(UTC)
    user = {"name": payload.name.strip(), "email": str(payload.email).lower(), "password_hash": hash_password(payload.password), "role": payload.role.value, "created_at": now, "updated_at": now}
    try:
        result = database.users.insert_one(user)
    except DuplicateKeyError as error:
        raise HTTPException(status_code=409, detail="An account with this email already exists") from error
    user["_id"] = result.inserted_id
    database.profiles.insert_one({"user_id": result.inserted_id, "created_at": now, "updated_at": now})
    database.skills.insert_one({"user_id": result.inserted_id, "communication_score": 0, "critical_thinking_score": 0, "debate_score": 0, "presentation_score": 0, "created_at": now, "updated_at": now})
    return public_user(user)

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, database: Database = Depends(get_db)) -> dict:
    user = database.users.find_one({"email": str(payload.email).lower()})
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    return {"access_token": create_access_token(str(user["_id"])), "user": public_user(user)}

@router.get("/me", response_model=UserPublic)
def current_user(user: dict = Depends(get_current_user)) -> dict:
    return public_user(user)
