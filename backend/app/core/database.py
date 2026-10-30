from collections.abc import Generator
import logging

from sqlalchemy import Connection, create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


logger = logging.getLogger(__name__)

database_url = settings.database_url

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    if database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class Base(DeclarativeBase):
    pass


def _ensure_unique_sqlite_index(
    connection: Connection,
    *,
    table_name: str,
    index_name: str,
    columns: tuple[str, ...],
) -> None:
    existing_indexes = connection.execute(text(f'PRAGMA index_list("{table_name}")')).fetchall()
    existing = next((index for index in existing_indexes if index[1] == index_name), None)
    if existing is not None:
        existing_columns = tuple(
            row[2]
            for row in connection.execute(text(f'PRAGMA index_info("{index_name}")')).fetchall()
        )
        if not existing[2] or existing_columns != columns:
            raise RuntimeError(
                f"SQLite index {index_name} exists with an unexpected definition; "
                "review the database schema before restarting."
            )
        return

    column_list = ", ".join(columns)
    connection.execute(
        text(f'CREATE UNIQUE INDEX "{index_name}" ON "{table_name}" ({column_list})')
    )


def _ensure_debate_argument_turn_order(connection: Connection) -> None:
    columns = {
        row[1]
        for row in connection.execute(text('PRAGMA table_info("debate_arguments")')).fetchall()
    }
    if "turn_order" not in columns:
        connection.execute(text("ALTER TABLE debate_arguments ADD COLUMN turn_order INTEGER"))
        rows = connection.execute(
            text(
                "SELECT id, debate_id FROM debate_arguments "
                "ORDER BY debate_id, created_at, id"
            )
        ).fetchall()
        turn_by_debate: dict[int, int] = {}
        for row in rows:
            turn_order = turn_by_debate.get(row.debate_id, 0) + 1
            turn_by_debate[row.debate_id] = turn_order
            connection.execute(
                text("UPDATE debate_arguments SET turn_order = :turn_order WHERE id = :id"),
                {"turn_order": turn_order, "id": row.id},
            )
        if rows:
            logger.warning(
                "Backfilled turn_order for %d legacy debate arguments using created_at, then id; "
                "review inferred ordering if timestamps are not reliable.",
                len(rows),
            )

    if "request_key" not in columns:
        connection.execute(text("ALTER TABLE debate_arguments ADD COLUMN request_key VARCHAR(64)"))

    null_count = connection.execute(
        text("SELECT COUNT(*) FROM debate_arguments WHERE turn_order IS NULL")
    ).scalar_one()
    if null_count:
        raise RuntimeError(
            f"Cannot create uq_debate_argument_turn_order: {null_count} debate argument(s) "
            "have NULL turn_order. Resolve ordering after reviewing debate history."
        )

    duplicate = connection.execute(
        text(
            "SELECT debate_id, turn_order, COUNT(*) AS row_count "
            "FROM debate_arguments GROUP BY debate_id, turn_order "
            "HAVING COUNT(*) > 1 LIMIT 1"
        )
    ).first()
    if duplicate is not None:
        raise RuntimeError(
            "Cannot create uq_debate_argument_turn_order: duplicate turn_order values exist "
            f"for debate {duplicate.debate_id}. Resolve ordering after reviewing debate history."
        )

    _ensure_unique_sqlite_index(
        connection,
        table_name="debate_arguments",
        index_name="uq_debate_argument_turn_order",
        columns=("debate_id", "turn_order"),
    )

    duplicate_request = connection.execute(
        text(
            "SELECT debate_id, user_id, request_key FROM debate_arguments "
            "WHERE request_key IS NOT NULL "
            "GROUP BY debate_id, user_id, request_key HAVING COUNT(*) > 1 LIMIT 1"
        )
    ).first()
    if duplicate_request is not None:
        raise RuntimeError(
            "Cannot create uq_debate_argument_request_key: duplicate request keys exist "
            f"for debate {duplicate_request.debate_id} and user {duplicate_request.user_id}."
        )

    _ensure_unique_sqlite_index(
        connection,
        table_name="debate_arguments",
        index_name="uq_debate_argument_request_key",
        columns=("debate_id", "user_id", "request_key"),
    )


def _initialize_sqlite_schema() -> None:
    if not database_url.startswith("sqlite"):
        return

    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(120) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(32) NOT NULL DEFAULT 'learner',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                experience_level VARCHAR(50),
                preferred_topics TEXT,
                presentation_domains TEXT,
                learning_goals VARCHAR(1000),
                coaching_preferences TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                communication_score INTEGER NOT NULL DEFAULT 0,
                critical_thinking_score INTEGER NOT NULL DEFAULT 0,
                argumentation_score INTEGER NOT NULL DEFAULT 0,
                confidence_score INTEGER NOT NULL DEFAULT 0,
                presentation_score INTEGER NOT NULL DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS debate_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic VARCHAR(255) NOT NULL,
                description TEXT,
                format VARCHAR(32) NOT NULL,
                scheduled_at DATETIME,
                created_by INTEGER NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
                ai_opponent BOOLEAN NOT NULL DEFAULT 0,
                request_key VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_debate_sessions_request_key ON debate_sessions (request_key)"))
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_debate_request_key ON debate_sessions (created_by, request_key)"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS debate_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                debate_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                position VARCHAR(16) NOT NULL DEFAULT 'neutral',
                is_ai BOOLEAN NOT NULL DEFAULT 0,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (debate_id) REFERENCES debate_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS debate_arguments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                debate_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                turn_order INTEGER NOT NULL,
                request_key VARCHAR(64),
                position VARCHAR(16) NOT NULL DEFAULT 'neutral',
                content TEXT NOT NULL,
                is_ai BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (debate_id) REFERENCES debate_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_debate_arguments_debate_id ON debate_arguments (debate_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_debate_arguments_user_id ON debate_arguments (user_id)"))
        _ensure_debate_argument_turn_order(connection)
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_debate_participant_membership ON debate_participants (debate_id, user_id)"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens (user_id)"))
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash ON password_reset_tokens (token_hash)"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS argument_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                debate_session_id INTEGER,
                topic VARCHAR(255) NOT NULL,
                argument_text TEXT NOT NULL,
                position VARCHAR(20),
                status VARCHAR(25) NOT NULL DEFAULT 'completed',
                overall_score FLOAT,
                claims TEXT,
                evidence TEXT,
                reasoning_assessment TEXT,
                detected_fallacies TEXT,
                scores TEXT,
                improvement_suggestions TEXT,
                feedback_report TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (debate_session_id) REFERENCES debate_sessions(id) ON DELETE SET NULL
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_argument_analyses_user_id ON argument_analyses (user_id)"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS debate_coaching_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                debate_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                category_scores TEXT NOT NULL,
                overall_score FLOAT,
                overall_assessment TEXT NOT NULL,
                strengths TEXT NOT NULL,
                weaknesses TEXT NOT NULL,
                improvement_suggestions TEXT NOT NULL,
                improvement_plan TEXT NOT NULL,
                source_argument_count INTEGER NOT NULL,
                provider VARCHAR(40) NOT NULL DEFAULT 'openai',
                model VARCHAR(120) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (debate_id) REFERENCES debate_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (debate_id, user_id, source_argument_count)
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_debate_coaching_records_debate_id ON debate_coaching_records (debate_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_debate_coaching_records_user_id ON debate_coaching_records (user_id)"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS presentation_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                display_filename VARCHAR(255) NOT NULL,
                storage_key VARCHAR(500) NOT NULL,
                submission_type VARCHAR(20) NOT NULL,
                mime_type VARCHAR(120) NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                idempotency_key VARCHAR(64),
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                error_message VARCHAR(500),
                transcript TEXT,
                duration_seconds FLOAT,
                word_count INTEGER,
                filler_word_count INTEGER,
                speaking_rate_wpm FLOAT,
                analysis_result TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (user_id, idempotency_key)
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_presentation_analyses_user_id ON presentation_analyses (user_id)"))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'general',
                is_read BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id)"))


_initialize_sqlite_schema()


def get_db() -> Generator[Session, None, None]:
    database = SessionLocal()
    try:
        yield database
    finally:
        database.close()