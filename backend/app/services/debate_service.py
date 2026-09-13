from sqlalchemy.orm import Session

from app.models.debate import DebateParticipant, DebateSession


def get_debate_or_none(database: Session, debate_id: int) -> DebateSession | None:
    return database.query(DebateSession).filter(DebateSession.id == debate_id).first()


def get_participant(database: Session, debate_id: int, user_id: int) -> DebateParticipant | None:
    return database.query(DebateParticipant).filter(DebateParticipant.debate_id == debate_id, DebateParticipant.user_id == user_id).first()
