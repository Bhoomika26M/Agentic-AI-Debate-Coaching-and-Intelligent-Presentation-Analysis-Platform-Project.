
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Float,
    ForeignKey,
)
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=True)


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        unique=True,
    )
    experience_level = Column(String(50), nullable=True)
    preferred_topics = Column(Text, nullable=True)
    presentation_domains = Column(Text, nullable=True)
    learning_goals = Column(Text, nullable=True)
    coaching_preferences = Column(Text, nullable=True)


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    topic = Column(String(255), nullable=False)
    debate_format = Column(String(100), nullable=False)
    position = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)


class DebateTurn(Base):
    __tablename__ = "debate_turns"

    id = Column(Integer, primary_key=True, index=True)
    debate_id = Column(
        Integer,
        ForeignKey("debate_sessions.id"),
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    speaker = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    turn_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=True)


class Argument(Base):
    __tablename__ = "arguments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    debate_id = Column(
        Integer,
        ForeignKey("debate_sessions.id"),
        nullable=True,
    )
    text = Column(Text, nullable=False)
    claim = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    reasoning_quality = Column(Float, nullable=True)
    evidence_strength = Column(Float, nullable=True)
    logical_consistency = Column(Float, nullable=True)
    persuasiveness = Column(Float, nullable=True)
    argument_score = Column(Float, nullable=True)
    fallacies = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)



class Presentation(Base):
    __tablename__ = "presentations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    title = Column(String(255), nullable=False)
    presentation_domain = Column(String(100), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    transcript = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Uploaded")
    created_at = Column(DateTime, nullable=True)
