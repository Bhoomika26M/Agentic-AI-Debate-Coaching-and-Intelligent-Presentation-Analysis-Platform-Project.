from enum import StrEnum


class DebateFormat(StrEnum):
    ONE_ON_ONE = "ONE_ON_ONE"
    PARLIAMENTARY = "PARLIAMENTARY"
    OXFORD = "OXFORD"
    POLICY = "POLICY"
    PUBLIC_FORUM = "PUBLIC_FORUM"
    AI_SIMULATION = "AI_SIMULATION"


class DebateStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DebatePosition(StrEnum):
    FOR = "FOR"
    AGAINST = "AGAINST"
    NEUTRAL = "NEUTRAL"
