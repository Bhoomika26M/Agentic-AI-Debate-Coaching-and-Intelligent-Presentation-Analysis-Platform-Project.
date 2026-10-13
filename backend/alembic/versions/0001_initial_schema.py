"""Initial schema - all tables

Revision ID: 0001
Revises:
Create Date: 2026-10-13 13:00:00.000000+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    userrole = postgresql.ENUM(
        "learner", "debate_coach", "educator", "administrator",
        name="userrole", create_type=True
    )
    authprovider = postgresql.ENUM("local", "google", name="authprovider", create_type=True)
    experiencelevel = postgresql.ENUM(
        "beginner", "intermediate", "advanced", name="experiencelevel", create_type=True
    )
    goalstatus = postgresql.ENUM(
        "not_started", "in_progress", "completed", "abandoned",
        name="goalstatus", create_type=True
    )
    skilltype = postgresql.ENUM(
        "clarity", "relevance", "evidence", "logic",
        "persuasiveness", "pace", "confidence", "engagement",
        name="skilltype", create_type=True
    )
    debateformat = postgresql.ENUM(
        "one_on_one", "parliamentary", "oxford", "policy", "public_forum", "ai_simulation",
        name="debateformat", create_type=True
    )
    sessionstatus = postgresql.ENUM(
        "scheduled", "active", "completed", "cancelled",
        name="sessionstatus", create_type=True
    )
    participantposition = postgresql.ENUM(
        "for", "against", "judge", "observer",
        name="participantposition", create_type=True
    )

    for enum in [userrole, authprovider, experiencelevel, goalstatus, skilltype,
                 debateformat, sessionstatus, participantposition]:
        enum.create(op.get_bind(), checkfirst=True)

    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("role", sa.Enum("learner","debate_coach","educator","administrator", name="userrole"), nullable=False),
        sa.Column("auth_provider", sa.Enum("local","google", name="authprovider"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # user_profiles
    op.create_table(
        "user_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("experience_level",
                  sa.Enum("beginner","intermediate","advanced", name="experiencelevel"), nullable=True),
        sa.Column("preferred_debate_topics", postgresql.JSONB(), nullable=True),
        sa.Column("presentation_domains", postgresql.JSONB(), nullable=True),
        sa.Column("coaching_preferences", postgresql.JSONB(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"])

    # learning_goals
    op.create_table(
        "learning_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("status",
                  sa.Enum("not_started","in_progress","completed","abandoned", name="goalstatus"),
                  nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_learning_goals_user_id", "learning_goals", ["user_id"])

    # skill_records
    op.create_table(
        "skill_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_type",
                  sa.Enum("clarity","relevance","evidence","logic",
                          "persuasiveness","pace","confidence","engagement", name="skilltype"),
                  nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(255), nullable=True),
    )
    op.create_index("ix_skill_records_user_skill", "skill_records",
                    ["user_id", "skill_type", "recorded_at"])

    # debate_topics
    op.create_table(
        "debate_topics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # debate_sessions
    op.create_table(
        "debate_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("debate_topics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("format",
                  sa.Enum("one_on_one","parliamentary","oxford","policy",
                          "public_forum","ai_simulation", name="debateformat"),
                  nullable=False),
        sa.Column("status",
                  sa.Enum("scheduled","active","completed","cancelled", name="sessionstatus"),
                  nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recording_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_debate_sessions_status", "debate_sessions", ["status", "scheduled_at"])

    # session_participants
    op.create_table(
        "session_participants",
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position",
                  sa.Enum("for","against","judge","observer", name="participantposition"),
                  nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("session_id", "user_id"),
    )
    op.create_index("ix_session_participants_session", "session_participants", ["session_id"])
    op.create_index("ix_session_participants_user", "session_participants", ["user_id"])

    # presentation_history
    op.create_table(
        "presentation_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("domain", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_presentation_history_user_id", "presentation_history", ["user_id"])


def downgrade() -> None:
    op.drop_table("presentation_history")
    op.drop_table("session_participants")
    op.drop_table("debate_sessions")
    op.drop_table("debate_topics")
    op.drop_table("skill_records")
    op.drop_table("learning_goals")
    op.drop_table("user_profiles")
    op.drop_table("users")

    for enum_name in ["participantposition", "sessionstatus", "debateformat",
                      "skilltype", "goalstatus", "experiencelevel", "authprovider", "userrole"]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
