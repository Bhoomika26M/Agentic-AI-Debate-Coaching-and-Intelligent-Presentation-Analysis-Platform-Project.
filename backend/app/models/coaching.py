from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class CoachingRecommendation(Base):
    __tablename__ = "coaching_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), default="Argumentation") # Argumentation, Speech & Pacing, Fallacy Prevention, Rebuttal
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="Medium") # High, Medium, Low
    
    # Actionable items & targeted practice drills
    recommended_exercises = Column(JSON, default=list) # [{"title": "...", "type": "drill", "duration": "10 min"}]
    personalized_learning_plan = Column(JSON, default=list)
    suggested_debate_topics = Column(JSON, default=list)
    communication_tips = Column(JSON, default=list)
    
    status = Column(String(30), default="Active") # Active, In Progress, Completed
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="coaching_recommendations")
