from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from ..core.database import Base

class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    format = Column(String, default="One-on-One") # e.g., Parliamentary, Oxford, etc.
    scheduled_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="scheduled") # scheduled, active, completed
    host_id = Column(Integer, index=True)
