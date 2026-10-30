from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class PresentationAnalysis(Base):
    __tablename__ = "presentation_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="Presentation Recording")
    audio_filename = Column(String(255), nullable=True)
    audio_filepath = Column(String(500), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    
    transcription = Column(Text, nullable=False)
    
    # Audio Speech Metrics
    words_per_minute = Column(Float, default=130.0)
    speech_pace_label = Column(String(50), default="Optimal (120-150 WPM)")
    total_words = Column(Integer, default=0)
    filler_words_count = Column(Integer, default=0)
    filler_words_breakdown = Column(JSON, default=dict)  # {"um": 3, "uh": 2, "like": 5}
    repeated_words = Column(JSON, default=list)          # list of repeated sequences/words
    pauses_detected = Column(Integer, default=0)
    
    # Evaluated & Inferred Metrics (Transparently labeled)
    confidence_score = Column(Float, default=78.0)
    clarity_score = Column(Float, default=82.0)
    audience_engagement_score = Column(Float, default=75.0)
    overall_presentation_score = Column(Float, default=78.5)
    
    # Analysis & Actionable Advice
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    improvement_recommendations = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="presentation_analyses")
