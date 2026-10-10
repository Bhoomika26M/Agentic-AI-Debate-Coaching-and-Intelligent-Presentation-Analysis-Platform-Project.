"""initial migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-10 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('LEARNER', 'DEBATE_COACH', 'EDUCATOR', 'ADMIN', name='userrole_enum'), nullable=False),
        sa.Column('oauth_provider', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)

    # 2. profiles table
    op.create_table(
        'profiles',
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('experience_level', sa.Enum('BEGINNER', 'INTERMEDIATE', 'ADVANCED', name='experiencelevel_enum'), nullable=False),
        sa.Column('preferred_topics', sa.JSON(), nullable=False),
        sa.Column('presentation_domains', sa.JSON(), nullable=False),
        sa.Column('coaching_style', sa.String(length=100), nullable=True),
        sa.Column('learning_goals', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )

    # 3. skills table
    op.create_table(
        'skills',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.Enum('ARGUMENTATION', 'REASONING', 'DELIVERY', 'RESEARCH', 'CRITICAL_THINKING', 'REBUTTAL', name='skillcategory_enum'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_skills_id'), 'skills', ['id'], unique=False)
    op.create_index(op.f('ix_skills_name'), 'skills', ['name'], unique=True)
    op.create_index(op.f('ix_skills_category'), 'skills', ['category'], unique=False)

    # 4. user_skills table
    op.create_table(
        'user_skills',
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('skill_id', sa.String(length=36), nullable=False),
        sa.Column('level', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'skill_id')
    )

    # 5. learning_goals table
    op.create_table(
        'learning_goals',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('target_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', name='goalstatus_enum'), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_learning_goals_id'), 'learning_goals', ['id'], unique=False)
    op.create_index(op.f('ix_learning_goals_user_id'), 'learning_goals', ['user_id'], unique=False)

    # 6. debate_topics table
    op.create_table(
        'debate_topics',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('difficulty', sa.Enum('BEGINNER', 'INTERMEDIATE', 'ADVANCED', name='topicdifficulty_enum'), nullable=False),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_debate_topics_category'), 'debate_topics', ['category'], unique=False)
    op.create_index(op.f('ix_debate_topics_id'), 'debate_topics', ['id'], unique=False)
    op.create_index(op.f('ix_debate_topics_title'), 'debate_topics', ['title'], unique=False)

    # 7. debate_sessions table
    op.create_table(
        'debate_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('topic_id', sa.String(length=36), nullable=False),
        sa.Column('format', sa.Enum('ONE_ON_ONE', 'PARLIAMENTARY', 'OXFORD', 'POLICY', 'PUBLIC_FORUM', 'AI_SIMULATION', name='debateformat_enum'), nullable=False),
        sa.Column('status', sa.Enum('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED', name='sessionstatus_enum'), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('duration_min', sa.Integer(), nullable=False, server_default='45'),
        sa.Column('created_by', sa.String(length=36), nullable=False),
        sa.Column('coach_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['coach_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['topic_id'], ['debate_topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_debate_sessions_id'), 'debate_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_debate_sessions_scheduled_at'), 'debate_sessions', ['scheduled_at'], unique=False)
    op.create_index(op.f('ix_debate_sessions_status'), 'debate_sessions', ['status'], unique=False)
    op.create_index(op.f('ix_debate_sessions_topic_id'), 'debate_sessions', ['topic_id'], unique=False)

    # 8. session_participants table
    op.create_table(
        'session_participants',
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('position', sa.Enum('PROPOSITION', 'OPPOSITION', 'NEUTRAL', name='participantposition_enum'), nullable=False),
        sa.Column('speaker_order', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['session_id'], ['debate_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('session_id', 'user_id')
    )

    # 9. session_recordings table
    op.create_table(
        'session_recordings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=False),
        sa.Column('type', sa.Enum('AUDIO', 'VIDEO', name='recordingtype_enum'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['session_id'], ['debate_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_session_recordings_id'), 'session_recordings', ['id'], unique=False)
    op.create_index(op.f('ix_session_recordings_session_id'), 'session_recordings', ['session_id'], unique=False)


def downgrade() -> None:
    op.drop_table('session_recordings')
    op.drop_table('session_participants')
    op.drop_table('debate_sessions')
    op.drop_table('debate_topics')
    op.drop_table('learning_goals')
    op.drop_table('user_skills')
    op.drop_table('skills')
    op.drop_table('profiles')
    op.drop_table('users')
