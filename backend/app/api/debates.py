from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.user import User
from ..models.debate import DebateSession
from ..schemas.debate import DebateSession as DebateSessionSchema, DebateSessionCreate
from .deps import get_current_active_user

router = APIRouter(prefix="/debates", tags=["debates"])

@router.post("/", response_model=DebateSessionSchema)
def create_debate_session(
    debate_in: DebateSessionCreate, 
    current_user: User = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    new_debate = DebateSession(
        title=debate_in.title,
        format=debate_in.format,
        scheduled_time=debate_in.scheduled_time,
        host_id=current_user.id
    )
    db.add(new_debate)
    db.commit()
    db.refresh(new_debate)
    return new_debate

@router.get("/", response_model=List[DebateSessionSchema])
def list_my_debates(
    current_user: User = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    debates = db.query(DebateSession).filter(DebateSession.host_id == current_user.id).all()
    return debates
