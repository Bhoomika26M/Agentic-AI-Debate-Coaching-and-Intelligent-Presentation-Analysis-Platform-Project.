"""add ordered debate turns and persistent coaching records"""

from alembic import op
import sqlalchemy as sa


revision = "0007_persistent_debate_coaching"
down_revision = "0006_password_reset_and_session_integrity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("debate_arguments", sa.Column("turn_order", sa.Integer(), nullable=True))
    op.add_column("debate_arguments", sa.Column("request_key", sa.String(length=64), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, debate_id FROM debate_arguments "
            "ORDER BY debate_id, created_at, id"
        )
    ).fetchall()
    turn_by_debate: dict[int, int] = {}
    for row in rows:
        turn_order = turn_by_debate.get(row.debate_id, 0) + 1
        turn_by_debate[row.debate_id] = turn_order
        connection.execute(
            sa.text("UPDATE debate_arguments SET turn_order = :turn_order WHERE id = :id"),
            {"turn_order": turn_order, "id": row.id},
        )

    with op.batch_alter_table("debate_arguments") as batch_op:
        batch_op.alter_column("turn_order", existing_type=sa.Integer(), nullable=False)

    op.create_index(
        "uq_debate_argument_turn_order",
        "debate_arguments",
        ["debate_id", "turn_order"],
        unique=True,
    )
    op.create_index(
        "uq_debate_argument_request_key",
        "debate_arguments",
        ["debate_id", "user_id", "request_key"],
        unique=True,
    )
    op.create_table(
        "debate_coaching_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "debate_id",
            sa.Integer(),
            sa.ForeignKey("debate_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_scores", sa.JSON(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("overall_assessment", sa.Text(), nullable=False),
        sa.Column("strengths", sa.JSON(), nullable=False),
        sa.Column("weaknesses", sa.JSON(), nullable=False),
        sa.Column("improvement_suggestions", sa.JSON(), nullable=False),
        sa.Column("improvement_plan", sa.JSON(), nullable=False),
        sa.Column("source_argument_count", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="openai"),
        sa.Column("model", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("debate_id", "user_id", "source_argument_count", name="uq_debate_coaching_snapshot"),
    )
    op.create_index("ix_debate_coaching_records_debate_id", "debate_coaching_records", ["debate_id"])
    op.create_index("ix_debate_coaching_records_user_id", "debate_coaching_records", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_debate_coaching_records_user_id", table_name="debate_coaching_records")
    op.drop_index("ix_debate_coaching_records_debate_id", table_name="debate_coaching_records")
    op.drop_table("debate_coaching_records")
    op.drop_index("uq_debate_argument_request_key", table_name="debate_arguments")
    op.drop_index("uq_debate_argument_turn_order", table_name="debate_arguments")
    with op.batch_alter_table("debate_arguments") as batch_op:
        batch_op.drop_column("request_key")
        batch_op.drop_column("turn_order")
