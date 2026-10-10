import enum

class UserRole(str, enum.Enum):
    LEARNER = "LEARNER"
    DEBATE_COACH = "DEBATE_COACH"
    EDUCATOR = "EDUCATOR"
    ADMIN = "ADMIN"

class ExperienceLevel(str, enum.Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"

class SkillCategory(str, enum.Enum):
    ARGUMENTATION = "ARGUMENTATION"
    REASONING = "REASONING"
    DELIVERY = "DELIVERY"
    RESEARCH = "RESEARCH"
    CRITICAL_THINKING = "CRITICAL_THINKING"
    REBUTTAL = "REBUTTAL"

class GoalStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

class TopicDifficulty(str, enum.Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"

class DebateFormat(str, enum.Enum):
    ONE_ON_ONE = "ONE_ON_ONE"
    PARLIAMENTARY = "PARLIAMENTARY"
    OXFORD = "OXFORD"
    POLICY = "POLICY"
    PUBLIC_FORUM = "PUBLIC_FORUM"
    AI_SIMULATION = "AI_SIMULATION"

class SessionStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class ParticipantPosition(str, enum.Enum):
    PROPOSITION = "PROPOSITION"
    OPPOSITION = "OPPOSITION"
    NEUTRAL = "NEUTRAL"

class RecordingType(str, enum.Enum):
    AUDIO = "AUDIO"
    VIDEO = "VIDEO"
