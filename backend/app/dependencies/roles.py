from app.dependencies.auth import require_roles
from app.models.user import UserRole

learner_or_above = require_roles(UserRole.LEARNER, UserRole.DEBATE_COACH, UserRole.EDUCATOR, UserRole.ADMINISTRATOR)
staff_only = require_roles(UserRole.DEBATE_COACH, UserRole.EDUCATOR, UserRole.ADMINISTRATOR)
administrator_only = require_roles(UserRole.ADMINISTRATOR)
