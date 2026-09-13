from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.debate import DebateParticipant, DebateSession
from app.models.user import User
from app.schemas.debate import DebateCreate, DebateResponse, DebateUpdate, ParticipantResponse
from app.services.auth_service import get_current_user
from app.services.debate_service import get_debate_or_none, get_participant


router = APIRouter(prefix="/debates", tags=["debates"])


@router.post("", response_model=DebateResponse, status_code=status.HTTP_201_CREATED)
def create_debate(payload: DebateCreate, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    debate = DebateSession(**payload.model_dump(), created_by=current_user.id)
    database.add(debate)
    database.commit()
    database.refresh(debate)
    return debate


@router.get("", response_model=list[DebateResponse])
def list_debates(database: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return database.query(DebateSession).order_by(DebateSession.created_at.desc()).all()


@router.get("/{debate_id}", response_model=DebateResponse)
def get_debate(debate_id: int, database: Session = Depends(get_db), _: User = Depends(get_current_user)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    return debate


@router.put("/{debate_id}", response_model=DebateResponse)
def update_debate(debate_id: int, payload: DebateUpdate, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the debate creator can update it")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(debate, field, value)
    database.commit()
    database.refresh(debate)
    return debate


@router.delete("/{debate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debate(debate_id: int, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the debate creator can delete it")
    database.delete(debate)
    database.commit()


@router.post("/{debate_id}/join", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
def join_debate(debate_id: int, position: str = "neutral", current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    if position not in {"for", "against", "neutral"}:
        raise HTTPException(status_code=422, detail="Invalid position")
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if get_participant(database, debate_id, current_user.id):
        raise HTTPException(status_code=409, detail="User already joined this debate")
    participant = DebateParticipant(debate_id=debate_id, user_id=current_user.id, position=position)
    database.add(participant)
    database.commit()
    database.refresh(participant)
    return participant


@router.get("/{debate_id}/participants", response_model=list[ParticipantResponse])
def list_participants(debate_id: int, database: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if get_debate_or_none(database, debate_id) is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    return database.query(DebateParticipant).filter(DebateParticipant.debate_id == debate_id).all()


@router.delete("/{debate_id}/participants/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant(debate_id: int, user_id: int, current_user: User = Depends(get_current_user), database: Session = Depends(get_db)):
    debate = get_debate_or_none(database, debate_id)
    if debate is None:
        raise HTTPException(status_code=404, detail="Debate not found")
    if debate.created_by != current_user.id and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can remove other participants")
    participant = get_participant(database, debate_id, user_id)
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    database.delete(participant)
    database.commit()
