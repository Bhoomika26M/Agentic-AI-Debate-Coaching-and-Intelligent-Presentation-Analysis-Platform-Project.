"""Create the Week 1-2 foundation tables."""

from alembic import op
import sqlalchemy as sa

revision = "20261005_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = sa.Enum("LEARNER", "DEBATE_COACH", "EDUCATOR", "ADMINISTRATOR", name="user_role")
    debate_format = sa.Enum("ONE_ON_ONE", "PARLIAMENTARY", "OXFORD", "POLICY", "PUBLIC_FORUM", "AI_SIMULATION", name="debate_format")
    debate_status = sa.Enum("SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED", name="debate_status")
    debate_position = sa.Enum("FOR", "AGAINST", "NEUTRAL", name="debate_position")
    bind = op.get_bind()
    for enum in (user_role, debate_format, debate_status, debate_position):
        enum.create(bind, checkfirst=True)

    op.create_table("users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table("profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("experience_level", sa.String(length=50)),
        sa.Column("preferred_debate_topics", sa.Text()),
        sa.Column("presentation_domains", sa.Text()),
        sa.Column("learning_goals", sa.Text()),
        sa.Column("coaching_preferences", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_profiles_user_id", "profiles", ["user_id"])
    op.create_table("skills",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("communication_score", sa.Integer(), nullable=False),
        sa.Column("critical_thinking_score", sa.Integer(), nullable=False),
        sa.Column("debate_score", sa.Integer(), nullable=False),
        sa.Column("presentation_score", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("communication_score BETWEEN 0 AND 100", name="ck_communication_score_range"),
        sa.CheckConstraint("critical_thinking_score BETWEEN 0 AND 100", name="ck_critical_thinking_score_range"),
        sa.CheckConstraint("debate_score BETWEEN 0 AND 100", name="ck_debate_score_range"),
        sa.CheckConstraint("presentation_score BETWEEN 0 AND 100", name="ck_presentation_score_range"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_skills_user_id", "skills", ["user_id"])
    op.create_table("debate_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("format", debate_format, nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("status", debate_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_debate_sessions_topic", "debate_sessions", ["topic"])
    op.create_index("ix_debate_sessions_scheduled_at", "debate_sessions", ["scheduled_at"])
    op.create_index("ix_debate_sessions_created_by", "debate_sessions", ["created_by"])
    op.create_table("debate_participants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("debate_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("position", debate_position, nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["debate_id"], ["debate_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("debate_id", "user_id", name="uq_debate_participant"),
    )
    op.create_index("ix_debate_participants_debate_id", "debate_participants", ["debate_id"])
    op.create_index("ix_debate_participants_user_id", "debate_participants", ["user_id"])


def downgrade() -> None:
    op.drop_table("debate_participants")
    op.drop_table("debate_sessions")
    op.drop_table("skills")
    op.drop_table("profiles")
    op.drop_table("users")
    bind = op.get_bind()
    for enum_name in ("debate_position", "debate_status", "debate_format", "user_role"):
        sa.Enum(name=enum_name).drop(bind, checkfirst=True)
