from sqlalchemy import Column, Integer, String, Boolean, Enum
import enum
from ..core.database import Base

class RoleEnum(str, enum.Enum):
    learner = "learner"
    coach = "coach"
    educator = "educator"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.learner)
    is_active = Column(Boolean, default=True)

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    experience_level = Column(String, default="beginner")
    preferred_topics = Column(String, nullable=True) # Stored as comma separated for now
    learning_goals = Column(String, nullable=True)
