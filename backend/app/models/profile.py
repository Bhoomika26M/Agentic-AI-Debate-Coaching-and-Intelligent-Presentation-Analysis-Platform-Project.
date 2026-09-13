from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    experience_level: Mapped[str | None] = mapped_column(String(50))
    preferred_topics: Mapped[list | None] = mapped_column(JSON)
    presentation_domains: Mapped[list | None] = mapped_column(JSON)
    learning_goals: Mapped[str | None] = mapped_column(String(1000))
    coaching_preferences: Mapped[dict | None] = mapped_column(JSON)

    user = relationship("User", back_populates="profile")
