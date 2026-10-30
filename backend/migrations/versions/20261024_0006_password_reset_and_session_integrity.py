"""password reset tokens and session integrity"""

from alembic import op
import sqlalchemy as sa

revision = "0006_password_reset_and_session_integrity"
down_revision = "0005_debate_idempotency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"], unique=False)
    op.create_index(op.f("ix_password_reset_tokens_token_hash"), "password_reset_tokens", ["token_hash"], unique=True)

    op.execute(
        """
        DELETE FROM debate_participants
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM debate_participants
            GROUP BY debate_id, user_id
        )
        """
    )
    op.execute(
        """
        DELETE FROM debate_sessions
        WHERE request_key IS NOT NULL
          AND id NOT IN (
              SELECT MIN(id)
              FROM debate_sessions
              WHERE request_key IS NOT NULL
              GROUP BY created_by, request_key
          )
        """
    )

    op.create_index(
        "uq_debate_participant_membership",
        "debate_participants",
        ["debate_id", "user_id"],
        unique=True,
    )
    op.create_index(
        "uq_debate_request_key",
        "debate_sessions",
        ["created_by", "request_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_debate_request_key", table_name="debate_sessions")
    op.drop_index("uq_debate_participant_membership", table_name="debate_participants")
    op.drop_index(op.f("ix_password_reset_tokens_token_hash"), table_name="password_reset_tokens")
    op.drop_index(op.f("ix_password_reset_tokens_user_id"), table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
