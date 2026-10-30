from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class ArgumentAnalysis(Base):
    __tablename__ = "argument_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    input_argument = Column(Text, nullable=False)
    topic = Column(String(255), nullable=True)
    
    # Analysis outputs
    main_claim = Column(Text, nullable=False)
    supporting_arguments = Column(JSON, default=list)  # list of identified premises/points
    evidence_assessment = Column(Text, nullable=True)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    missing_evidence = Column(Text, nullable=True)
    suggestions = Column(JSON, default=list)
    
    # Detailed sub-scores (0-100)
    clarity_score = Column(Float, default=70.0)
    relevance_score = Column(Float, default=75.0)
    evidence_strength_score = Column(Float, default=65.0)
    logical_consistency_score = Column(Float, default=70.0)
    persuasiveness_score = Column(Float, default=72.0)
    overall_score = Column(Float, default=70.4)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="argument_analyses")

class FallacyDetection(Base):
    __tablename__ = "fallacy_detections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    input_text = Column(Text, nullable=False)
    has_fallacies = Column(Boolean, default=False)
    
    # Detailed list of detected fallacies:
    # Each item: {
    #   "name": "Ad Hominem", 
    #   "sentence": "...",
    #   "explanation": "...",
    #   "problematic_reasoning": "...",
    #   "corrected_version": "...",
    #   "improvement_tips": "..."
    # }
    fallacies = Column(JSON, default=list)
    credibility_impact = Column(String(50), default="Moderate")
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="fallacy_detections")

class Counterargument(Base):
    __tablename__ = "counterarguments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    input_argument = Column(Text, nullable=False)
    topic = Column(String(255), nullable=True)
    
    # Specific counterargument categories
    logical_rebuttals = Column(JSON, default=list)
    evidence_based_rebuttals = Column(JSON, default=list)
    ethical_counterarguments = Column(JSON, default=list)
    practical_counterarguments = Column(JSON, default=list)
    policy_counterarguments = Column(JSON, default=list)
    alternative_perspectives = Column(JSON, default=list)
    challenge_questions = Column(JSON, default=list)
    debate_strategy_suggestions = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="counterarguments")
