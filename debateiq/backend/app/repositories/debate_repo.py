from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.debate import (
    DebateTopic,
    DebateSession,
    SessionParticipant,
    DebateTurn,
    SessionStatus,
    DebateFormat,
)

class DebateRepository:
    def __init__(self, db: Session):
        self.db = db

    # Topics
    def list_topics(self, category: Optional[str] = None, limit: int = 50) -> List[DebateTopic]:
        query = self.db.query(DebateTopic)
        if category and category != "All":
            query = query.filter(DebateTopic.category == category)
        return query.order_by(DebateTopic.created_at.desc()).limit(limit).all()

    def get_topic_by_id(self, topic_id: str) -> Optional[DebateTopic]:
        return self.db.query(DebateTopic).filter(DebateTopic.id == topic_id).first()

    def create_topic(
        self,
        title: str,
        motion_text: str,
        category: str,
        difficulty: str,
        proposition_summary: Optional[str] = None,
        opposition_summary: Optional[str] = None,
        is_curated: bool = False,
        created_by: Optional[str] = None,
    ) -> DebateTopic:
        topic = DebateTopic(
            title=title,
            motion_text=motion_text,
            category=category,
            difficulty=difficulty,
            proposition_summary=proposition_summary,
            opposition_summary=opposition_summary,
            is_curated=is_curated,
            created_by=created_by,
        )
        self.db.add(topic)
        self.db.commit()
        self.db.refresh(topic)
        return topic

    # Sessions
    def list_sessions(self, user_id: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[DebateSession]:
        query = self.db.query(DebateSession)
        if status:
            query = query.filter(DebateSession.status == status)
        if user_id:
            query = query.filter(
                (DebateSession.created_by == user_id) |
                (DebateSession.participants.any(SessionParticipant.user_id == user_id))
            )
        return query.order_by(DebateSession.created_at.desc()).limit(limit).all()

    def get_session_by_id(self, session_id: str) -> Optional[DebateSession]:
        return self.db.query(DebateSession).filter(DebateSession.id == session_id).first()

    def create_session(
        self,
        topic_id: str,
        format_name: str,
        created_by: str,
        ai_persona: str = "Socratic Questioner",
        ai_difficulty: str = "Intermediate",
        user_position: str = "proposition",
        scheduled_at: Optional[Any] = None,
    ) -> DebateSession:
        session = DebateSession(
            topic_id=topic_id,
            format=format_name,
            status=SessionStatus.LIVE if not scheduled_at else SessionStatus.SCHEDULED,
            current_round=1,
            turn_timer_seconds=120,
            active_speaker_position=user_position,
            ai_opponent_difficulty=ai_difficulty,
            ai_persona=ai_persona,
            created_by=created_by,
            scheduled_at=scheduled_at,
        )
        self.db.add(session)
        self.db.flush()

        # Add human participant
        human_part = SessionParticipant(
            session_id=session.id,
            user_id=created_by,
            is_ai=False,
            position=user_position,
            speaker_order_index=1 if user_position == "proposition" else 2,
        )
        self.db.add(human_part)

        # Add AI opponent participant if AI simulation or One-on-One
        opp_position = "opposition" if user_position == "proposition" else "proposition"
        ai_part = SessionParticipant(
            session_id=session.id,
            user_id=None,
            is_ai=True,
            ai_persona=ai_persona,
            position=opp_position,
            speaker_order_index=2 if user_position == "proposition" else 1,
        )
        self.db.add(ai_part)

        self.db.commit()
        self.db.refresh(session)
        return session

    def update_session(self, session_id: str, updates: Dict[str, Any]) -> Optional[DebateSession]:
        session = self.get_session_by_id(session_id)
        if session:
            for key, value in updates.items():
                if value is not None and hasattr(session, key):
                    setattr(session, key, value)
            self.db.commit()
            self.db.refresh(session)
        return session

    # Turns
    def record_turn(
        self,
        session_id: str,
        speaker_id: Optional[str],
        speaker_position: str,
        round_number: int,
        speech_text: str,
        turn_type: str = "speech",
        wpm: Optional[float] = None,
        filler_word_count: Optional[int] = None,
    ) -> DebateTurn:
        turn = DebateTurn(
            session_id=session_id,
            speaker_id=speaker_id,
            speaker_position=speaker_position,
            round_number=round_number,
            turn_type=turn_type,
            speech_text=speech_text,
            wpm=wpm or 135.0,
            filler_word_count=filler_word_count or 0,
        )
        self.db.add(turn)
        self.db.commit()
        self.db.refresh(turn)
        return turn

    def list_turns(self, session_id: str) -> List[DebateTurn]:
        return self.db.query(DebateTurn).filter(DebateTurn.session_id == session_id).order_by(DebateTurn.created_at.asc()).all()
