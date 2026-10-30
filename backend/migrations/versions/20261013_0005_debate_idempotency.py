"""add debate creation idempotency key"""

from alembic import op
import sqlalchemy as sa

revision = "0005_debate_idempotency"
down_revision = "0004_ai_debate_features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("debate_sessions", sa.Column("request_key", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_debate_sessions_request_key"), "debate_sessions", ["request_key"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_debate_sessions_request_key"), table_name="debate_sessions")
    op.drop_column("debate_sessions", "request_key")
