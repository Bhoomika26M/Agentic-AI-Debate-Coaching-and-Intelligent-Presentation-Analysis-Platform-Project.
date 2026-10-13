from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


# Import all models here so Alembic's autogenerate can detect them.
# DO NOT remove these imports even if they appear unused.
from app.models.user import User  # noqa: E402, F401
from app.models.profile import UserProfile, LearningGoal  # noqa: E402, F401
from app.models.skill import SkillRecord  # noqa: E402, F401
from app.models.debate import (  # noqa: E402, F401
    DebateTopic,
    DebateSession,
    SessionParticipant,
    PresentationHistory,
)
