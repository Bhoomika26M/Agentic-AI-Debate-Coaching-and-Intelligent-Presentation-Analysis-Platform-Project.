"""add debate arguments table"""

from alembic import op
import sqlalchemy as sa

revision = "0003_debate_arguments"
down_revision = "0002_argument_analysis"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "debate_arguments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("debate_id", sa.Integer(), sa.ForeignKey("debate_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Enum("for", "against", "neutral", name="argument_position"), nullable=False, server_default="neutral"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(op.f("ix_debate_arguments_debate_id"), "debate_arguments", ["debate_id"], unique=False)
    op.create_index(op.f("ix_debate_arguments_user_id"), "debate_arguments", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_debate_arguments_user_id"), table_name="debate_arguments")
    op.drop_index(op.f("ix_debate_arguments_debate_id"), table_name="debate_arguments")
    op.drop_table("debate_arguments")
