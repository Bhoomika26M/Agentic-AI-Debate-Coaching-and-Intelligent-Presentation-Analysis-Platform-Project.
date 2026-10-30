"""add argument analysis persistence"""

from alembic import op
import sqlalchemy as sa

revision = "0002_argument_analysis"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "argument_analyses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("debate_session_id", sa.Integer(), sa.ForeignKey("debate_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("topic", sa.String(255), nullable=False),
        sa.Column("argument_text", sa.Text(), nullable=False),
        sa.Column("position", sa.String(20), nullable=True),
        sa.Column("status", sa.String(25), nullable=False, server_default="completed"),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("claims", sa.JSON(), nullable=True),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("reasoning_assessment", sa.JSON(), nullable=True),
        sa.Column("detected_fallacies", sa.JSON(), nullable=True),
        sa.Column("scores", sa.JSON(), nullable=True),
        sa.Column("improvement_suggestions", sa.JSON(), nullable=True),
        sa.Column("feedback_report", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(op.f("ix_argument_analyses_user_id"), "argument_analyses", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_argument_analyses_user_id"), table_name="argument_analyses")
    op.drop_table("argument_analyses")
