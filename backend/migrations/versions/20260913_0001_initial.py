"""initial milestone 1 schema"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = postgresql.ENUM("learner", "debate_coach", "educator", "administrator", name="user_role", create_type=False)
    debate_format = postgresql.ENUM("one_on_one", "parliamentary", "oxford", "policy", "public_forum", "ai_simulation", name="debate_format", create_type=False)
    debate_status = postgresql.ENUM("scheduled", "active", "completed", "cancelled", name="debate_status", create_type=False)
    participant_position = postgresql.ENUM("for", "against", "neutral", name="participant_position", create_type=False)
    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    debate_format.create(bind, checkfirst=True)
    debate_status.create(bind, checkfirst=True)
    participant_position.create(bind, checkfirst=True)
    op.create_table("users", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("email", sa.String(255), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("role", user_role, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table("profiles", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("experience_level", sa.String(50)), sa.Column("preferred_topics", sa.JSON()), sa.Column("presentation_domains", sa.JSON()), sa.Column("learning_goals", sa.String(1000)), sa.Column("coaching_preferences", sa.JSON()), sa.UniqueConstraint("user_id"))
    op.create_table("skills", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("communication_score", sa.Integer(), nullable=False), sa.Column("critical_thinking_score", sa.Integer(), nullable=False), sa.Column("argumentation_score", sa.Integer(), nullable=False), sa.Column("confidence_score", sa.Integer(), nullable=False), sa.Column("presentation_score", sa.Integer(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.UniqueConstraint("user_id"))
    op.create_table("debate_sessions", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("topic", sa.String(255), nullable=False), sa.Column("description", sa.Text()), sa.Column("format", debate_format, nullable=False), sa.Column("scheduled_at", sa.DateTime(timezone=True)), sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("status", debate_status, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("debate_participants", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("debate_id", sa.Integer(), sa.ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("position", participant_position, nullable=False), sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()))


def downgrade() -> None:
    op.drop_table("debate_participants")
    op.drop_table("debate_sessions")
    op.drop_table("skills")
    op.drop_table("profiles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    bind = op.get_bind()
    for enum_name in ("participant_position", "debate_status", "debate_format", "user_role"):
        sa.Enum(name=enum_name).drop(bind, checkfirst=True)
