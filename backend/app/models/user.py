from enum import StrEnum


class UserRole(StrEnum):
    LEARNER = "LEARNER"
    DEBATE_COACH = "DEBATE_COACH"
    EDUCATOR = "EDUCATOR"
    ADMINISTRATOR = "ADMINISTRATOR"
