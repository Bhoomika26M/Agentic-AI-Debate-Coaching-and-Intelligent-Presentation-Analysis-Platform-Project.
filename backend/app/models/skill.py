from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    communication_score: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    critical_thinking_score: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    argumentation_score: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    confidence_score: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    presentation_score: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="skill")
