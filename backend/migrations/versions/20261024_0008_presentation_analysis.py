"""add private presentation submissions and analysis reports"""

from alembic import op
import sqlalchemy as sa


revision = "0008_presentation_analysis"
down_revision = "0007_persistent_debate_coaching"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("presentation_analyses"):
        op.create_table(
            "presentation_analyses",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("display_filename", sa.String(length=255), nullable=False),
            sa.Column("storage_key", sa.String(length=500), nullable=False),
            sa.Column("submission_type", sa.String(length=20), nullable=False),
            sa.Column("mime_type", sa.String(length=120), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), nullable=False),
            sa.Column("idempotency_key", sa.String(length=64), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("error_message", sa.String(length=500), nullable=True),
            sa.Column("transcript", sa.Text(), nullable=True),
            sa.Column("duration_seconds", sa.Float(), nullable=True),
            sa.Column("word_count", sa.Integer(), nullable=True),
            sa.Column("filler_word_count", sa.Integer(), nullable=True),
            sa.Column("speaking_rate_wpm", sa.Float(), nullable=True),
            sa.Column("analysis_result", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("user_id", "idempotency_key", name="uq_presentation_user_request"),
        )
    if "ix_presentation_analyses_user_id" not in {
        index["name"] for index in sa.inspect(op.get_bind()).get_indexes("presentation_analyses")
    }:
        op.create_index("ix_presentation_analyses_user_id", "presentation_analyses", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_presentation_analyses_user_id", table_name="presentation_analyses")
    op.drop_table("presentation_analyses")
