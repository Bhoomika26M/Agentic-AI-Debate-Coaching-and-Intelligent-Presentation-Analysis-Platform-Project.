import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

# 1. Role Model
class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False) # learner, coach, educator, admin
    description = Column(String(255), nullable=True)

# 2. User Model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="learner", nullable=False) # learner, coach, educator, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("LearningGoal", back_populates="user", cascade="all, delete-orphan")
    debates = relationship("DebateSession", back_populates="user", cascade="all, delete-orphan")
    presentations = relationship("PresentationSession", back_populates="user", cascade="all, delete-orphan")
    learning_paths = relationship("LearningPath", back_populates="user", cascade="all, delete-orphan")
    exercise_attempts = relationship("ExerciseAttempt", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")

# 3. User Profile
class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    experience_level = Column(String(50), default="Beginner") # Beginner, Intermediate, Advanced, Expert
    preferred_topics = Column(Text, default="Technology, Ethics, Education, Economics, Governance")
    presentation_domains = Column(Text, default="Business Pitch, Keynote, Academic, Debate")
    learning_goals = Column(Text, default="Improve rebuttal speed, eliminate logical fallacies, reduce filler words")
    coaching_preferences = Column(Text, default="Direct, Socratic, Constructive, Evidence-focused")
    bio = Column(Text, nullable=True)
    communication_level = Column(Integer, default=70)
    debate_level = Column(Integer, default=65)
    critical_thinking_level = Column(Integer, default=72)
    presentation_level = Column(Integer, default=68)
    confidence_level = Column(Integer, default=75)

    user = relationship("User", back_populates="profile")

# 4. Skill Model
class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

# 5. UserSkill Model
class UserSkill(Base):
    __tablename__ = "user_skills"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    current_score = Column(Float, default=70.0)
    historical_scores = Column(Text, default="[]") # JSON list of {date, score}
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="skills")
    skill = relationship("Skill")

# 6. LearningGoal Model
class LearningGoal(Base):
    __tablename__ = "learning_goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    target_date = Column(String(50), nullable=True)
    target_score = Column(Float, default=85.0)
    status = Column(String(50), default="In Progress") # In Progress, Completed, Planned
    progress = Column(Integer, default=45) # 0-100%
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="goals")

# 7. DebateTopic Model
class DebateTopic(Base):
    __tablename__ = "debate_topics"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    category = Column(String(100), default="General")
    description = Column(Text, nullable=True)
    suggested_positions = Column(String(255), default="For, Against, Neutral")
    difficulty = Column(String(50), default="Intermediate")

# 8. DebateSession Model
class DebateSession(Base):
    __tablename__ = "debate_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic = Column(String(500), nullable=False)
    position = Column(String(50), default="For") # For, Against, Neutral / Exploratory
    format = Column(String(50), default="One-on-One Debate") # One-on-One, Parliamentary, Oxford, Policy, Public Forum, AI Debate Simulation
    difficulty = Column(String(50), default="Intermediate") # Beginner, Intermediate, Advanced, Expert
    duration_minutes = Column(Integer, default=10) # 3, 5, 10, 15, custom
    ai_opponent_personality = Column(String(50), default="Analytical") # Friendly, Analytical, Aggressive, Skeptical, Evidence-focused, Socratic
    rounds_count = Column(Integer, default=3)
    current_round = Column(Integer, default=1)
    status = Column(String(50), default="active") # active, completed, abandoned
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="debates")
    rounds = relationship("DebateRound", back_populates="session", cascade="all, delete-orphan")
    score = relationship("DebateScore", back_populates="session", uselist=False, cascade="all, delete-orphan")

# 9. DebateParticipant Model
class DebateParticipant(Base):
    __tablename__ = "debate_participants"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role_in_debate = Column(String(50), default="Debater")
    position = Column(String(50), default="For")

# 10. DebateRound Model
class DebateRound(Base):
    __tablename__ = "debate_rounds"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), nullable=False)
    round_number = Column(Integer, default=1)
    user_transcript = Column(Text, nullable=True)
    ai_transcript = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("DebateSession", back_populates="rounds")
    arguments = relationship("Argument", back_populates="round", cascade="all, delete-orphan")
    counterarguments = relationship("Counterargument", back_populates="round", cascade="all, delete-orphan")

# 11. Argument Model
class Argument(Base):
    __tablename__ = "arguments"
    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("debate_rounds.id"), nullable=False)
    speaker = Column(String(50), default="user") # user, ai
    raw_text = Column(Text, nullable=False)
    argument_strength_score = Column(Float, default=75.0)
    reasoning_quality_score = Column(Float, default=70.0)
    clarity_score = Column(Float, default=75.0)
    relevance_score = Column(Float, default=80.0)
    evidence_score = Column(Float, default=65.0)
    consistency_score = Column(Float, default=75.0)
    persuasiveness_score = Column(Float, default=72.0)
    improved_version = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    round = relationship("DebateRound", back_populates="arguments")
    claims = relationship("Claim", back_populates="argument", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="argument", cascade="all, delete-orphan")
    fallacies = relationship("Fallacy", back_populates="argument", cascade="all, delete-orphan")

# 12. Claim Model
class Claim(Base):
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True, index=True)
    argument_id = Column(Integer, ForeignKey("arguments.id"), nullable=False)
    text = Column(Text, nullable=False)
    claim_type = Column(String(50), default="Main Claim") # Main Claim, Sub-claim, Assumption, Conclusion

    argument = relationship("Argument", back_populates="claims")

# 13. Evidence Model
class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True, index=True)
    argument_id = Column(Integer, ForeignKey("arguments.id"), nullable=False)
    text = Column(Text, nullable=False)
    evidence_type = Column(String(50), default="Empirical") # Empirical, Statistical, Anecdotal, Expert Opinion, Historical
    relevance_score = Column(Float, default=75.0)
    strength_score = Column(Float, default=70.0)
    quality_score = Column(Float, default=72.0)
    sufficiency_score = Column(Float, default=68.0)

    argument = relationship("Argument", back_populates="evidence")

# 14. Fallacy Model
class Fallacy(Base):
    __tablename__ = "fallacies"
    id = Column(Integer, primary_key=True, index=True)
    argument_id = Column(Integer, ForeignKey("arguments.id"), nullable=False)
    fallacy_name = Column(String(100), nullable=False) # Ad Hominem, Straw Man, False Dilemma, Slippery Slope, Appeal to Authority, Circular Reasoning, Hasty Generalization, Red Herring
    confidence = Column(Float, default=0.85)
    problematic_statement = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    why_problematic = Column(Text, nullable=False)
    correct_reasoning = Column(Text, nullable=False)
    suggested_correction = Column(Text, nullable=False)
    improved_argument = Column(Text, nullable=False)

    argument = relationship("Argument", back_populates="fallacies")

# 15. Counterargument Model
class Counterargument(Base):
    __tablename__ = "counterarguments"
    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("debate_rounds.id"), nullable=False)
    logical_rebuttal = Column(Text, nullable=False)
    evidence_rebuttal = Column(Text, nullable=False)
    ethical_rebuttal = Column(Text, nullable=False)
    practical_rebuttal = Column(Text, nullable=False)
    policy_rebuttal = Column(Text, nullable=False)
    challenge_questions = Column(Text, default="[]") # JSON list of challenge questions
    strategy_suggestions = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)

    round = relationship("DebateRound", back_populates="counterarguments")

# 16. DebateScore Model (Weighted exactly per specification: 30%, 20%, 20%, 15%, 15%)
class DebateScore(Base):
    __tablename__ = "debate_scores"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("debate_sessions.id"), unique=True, nullable=False)
    argument_quality = Column(Float, default=78.0)      # 30%
    evidence_usage = Column(Float, default=72.0)        # 20%
    logical_consistency = Column(Float, default=80.0)   # 20%
    rebuttal_effectiveness = Column(Float, default=75.0)# 15%
    communication_skills = Column(Float, default=82.0)  # 15%
    overall_score = Column(Float, default=77.3)         # 100% total weighted
    strongest_argument = Column(Text, nullable=True)
    weakest_argument = Column(Text, nullable=True)
    best_rebuttal = Column(Text, nullable=True)
    detected_fallacies_count = Column(Integer, default=0)
    missing_evidence = Column(Text, nullable=True)
    suggested_improvement = Column(Text, nullable=True)
    coaching_summary = Column(Text, nullable=True)
    next_practice_exercise = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("DebateSession", back_populates="score")

# 17. PresentationSession Model
class PresentationSession(Base):
    __tablename__ = "presentation_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    media_filename = Column(String(500), nullable=True)
    media_type = Column(String(50), default="audio") # audio, video, mic_recording
    duration_seconds = Column(Float, default=120.0)
    status = Column(String(50), default="completed") # processing, completed, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="presentations")
    metrics = relationship("PresentationMetric", back_populates="session", uselist=False, cascade="all, delete-orphan")
    transcript = relationship("Transcript", back_populates="session", uselist=False, cascade="all, delete-orphan")

# 18. PresentationMetric Model
class PresentationMetric(Base):
    __tablename__ = "presentation_metrics"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("presentation_sessions.id"), unique=True, nullable=False)
    words_per_minute = Column(Float, default=142.0)
    pace_classification = Column(String(50), default="Balanced") # Very slow, Slow, Balanced, Fast, Very fast
    filler_words_count = Column(Integer, default=8)
    filler_words_breakdown = Column(Text, default="{}") # JSON: {"um": 3, "uh": 2, "like": 2, "basically": 1}
    confidence_score = Column(Float, default=76.0) # 0-100
    clarity_score = Column(Float, default=80.0) # 0-100
    engagement_score = Column(Float, default=74.0) # 0-100
    speaking_score = Column(Float, default=78.0) # 0-100
    overall_score = Column(Float, default=77.0) # 0-100
    pace_timeline = Column(Text, default="[]") # JSON list of {time_sec, wpm}
    confidence_explanation = Column(Text, nullable=True)
    strengths = Column(Text, default="Clear articulation, steady pace")
    weaknesses = Column(Text, default="Frequent pauses before key assertions, minor filler words")
    recommended_improvements = Column(Text, default="Use deliberate silent pauses instead of 'um'; practice transitions")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("PresentationSession", back_populates="metrics")

# 19. Transcript Model
class Transcript(Base):
    __tablename__ = "transcripts"
    id = Column(Integer, primary_key=True, index=True)
    presentation_id = Column(Integer, ForeignKey("presentation_sessions.id"), unique=True, nullable=False)
    text = Column(Text, nullable=False)
    timestamps_json = Column(Text, default="[]") # JSON list of {start, end, word}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("PresentationSession", back_populates="transcript")

# 20. CoachingFeedback Model
class CoachingFeedback(Base):
    __tablename__ = "coaching_feedback"
    id = Column(Integer, primary_key=True, index=True)
    session_id_ref = Column(Integer, nullable=False)
    feedback_type = Column(String(50), default="debate") # debate, presentation
    what_went_well = Column(Text, nullable=False)
    needs_improvement = Column(Text, nullable=False)
    recommended_exercises = Column(Text, nullable=True)
    action_plan = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# 21. LearningPath Model
class LearningPath(Base):
    __tablename__ = "learning_paths"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="Debate & Presentation Mastery Path")
    current_week = Column(Integer, default=1)
    total_weeks = Column(Integer, default=6)
    weekly_modules = Column(Text, default="[]") # JSON list of weekly modules & milestones
    status = Column(String(50), default="In Progress") # In Progress, Completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="learning_paths")

# 22. LearningExercise Model
class LearningExercise(Base):
    __tablename__ = "learning_exercises"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False) # Fallacy, Argument, Evidence, Rebuttal, Presentation
    difficulty = Column(String(50), default="Intermediate")
    prompt = Column(Text, nullable=False)
    sample_solution = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    attempts = relationship("ExerciseAttempt", back_populates="exercise", cascade="all, delete-orphan")

# 23. ExerciseAttempt Model
class ExerciseAttempt(Base):
    __tablename__ = "exercise_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("learning_exercises.id"), nullable=False)
    user_submission = Column(Text, nullable=False)
    ai_score = Column(Float, default=80.0)
    ai_feedback = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=True)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="exercise_attempts")
    exercise = relationship("LearningExercise", back_populates="attempts")

# 24. Notification Model
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="feedback") # reminder, feedback, milestone, announcement
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")

# 25. Report Model
class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(String(50), nullable=False) # debate, presentation, performance, learning_progress
    reference_id = Column(Integer, nullable=True)
    title = Column(String(255), nullable=False)
    data_snapshot = Column(Text, default="{}") # JSON snapshot of report data
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reports")
