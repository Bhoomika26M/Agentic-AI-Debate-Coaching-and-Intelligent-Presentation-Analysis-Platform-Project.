"""add ai opponent flags and display metadata"""

from alembic import op
import sqlalchemy as sa

revision = "0004_ai_debate_features"
down_revision = "0003_debate_arguments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("debate_sessions", sa.Column("ai_opponent", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("debate_participants", sa.Column("is_ai", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("debate_arguments", sa.Column("is_ai", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("debate_arguments", "is_ai")
    op.drop_column("debate_participants", "is_ai")
    op.drop_column("debate_sessions", "ai_opponent")
