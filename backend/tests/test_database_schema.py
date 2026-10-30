import pytest
from sqlalchemy import create_engine, inspect, text

from app.core import database


def test_sqlite_startup_upgrades_legacy_debate_arguments_idempotently(tmp_path, monkeypatch):
    database_path = tmp_path / "legacy.db"
    legacy_engine = create_engine(f"sqlite:///{database_path.as_posix()}")
    with legacy_engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE debate_arguments (
                    id INTEGER PRIMARY KEY,
                    debate_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    position VARCHAR(16) NOT NULL,
                    content TEXT NOT NULL,
                    is_ai BOOLEAN NOT NULL,
                    created_at DATETIME
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO debate_arguments
                    (id, debate_id, user_id, position, content, is_ai, created_at)
                VALUES
                    (1, 8, 3, 'for', 'first', 0, '2026-10-24 10:00:00'),
                    (2, 8, 3, 'against', 'second', 1, '2026-10-24 10:00:00'),
                    (3, 8, 3, 'for', 'third', 0, '2026-10-24 10:01:00'),
                    (4, 9, 3, 'for', 'another debate', 0, '2026-10-24 09:00:00')
                """
            )
        )

    monkeypatch.setattr(database, "engine", legacy_engine)
    monkeypatch.setattr(database, "database_url", f"sqlite:///{database_path.as_posix()}")

    database._initialize_sqlite_schema()
    with legacy_engine.connect() as connection:
        expected_turns = [(1, 1), (2, 2), (3, 3), (4, 1)]
        assert connection.execute(
            text("SELECT id, turn_order FROM debate_arguments ORDER BY id")
        ).all() == expected_turns
        columns = {column["name"] for column in inspect(connection).get_columns("debate_arguments")}
        assert {"turn_order", "request_key"} <= columns

    database._initialize_sqlite_schema()
    with legacy_engine.connect() as connection:
        assert connection.execute(
            text("SELECT id, turn_order FROM debate_arguments ORDER BY id")
        ).all() == expected_turns
        indexes = {
            index["name"]: index
            for index in inspect(connection).get_indexes("debate_arguments")
        }
        assert indexes["uq_debate_argument_turn_order"]["unique"] == 1
        assert indexes["uq_debate_argument_request_key"]["unique"] == 1
    legacy_engine.dispose()


@pytest.mark.parametrize(
    ("values", "error_fragment"),
    [
        ([(1, 2, None), (2, 2, 2)], "NULL turn_order"),
        ([(1, 2, 1), (2, 2, 1)], "duplicate turn_order"),
    ],
)
def test_sqlite_startup_refuses_ambiguous_existing_turn_order(tmp_path, values, error_fragment):
    database_path = tmp_path / "invalid.db"
    engine = create_engine(f"sqlite:///{database_path.as_posix()}")
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE debate_arguments (
                    id INTEGER PRIMARY KEY,
                    debate_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    turn_order INTEGER,
                    request_key VARCHAR(64),
                    created_at DATETIME
                )
                """
            )
        )
        for argument_id, debate_id, turn_order in values:
            connection.execute(
                text(
                    "INSERT INTO debate_arguments (id, debate_id, user_id, turn_order) "
                    "VALUES (:id, :debate_id, 1, :turn_order)"
                ),
                {"id": argument_id, "debate_id": debate_id, "turn_order": turn_order},
            )

    with engine.begin() as connection:
        with pytest.raises(RuntimeError, match=error_fragment):
            database._ensure_debate_argument_turn_order(connection)

    with engine.connect() as connection:
        saved_values = connection.execute(
            text("SELECT id, turn_order FROM debate_arguments ORDER BY id")
        ).all()
        assert saved_values == [(row[0], row[2]) for row in values]
        index_names = {
            index["name"] for index in inspect(connection).get_indexes("debate_arguments")
        }
        assert "uq_debate_argument_turn_order" not in index_names
    engine.dispose()


def test_sqlite_index_creation_rejects_wrong_existing_index_definition():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(
            text("CREATE TABLE debate_arguments (debate_id INTEGER, turn_order INTEGER, user_id INTEGER)")
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX uq_debate_argument_turn_order "
                "ON debate_arguments (debate_id, user_id)"
            )
        )

        with pytest.raises(RuntimeError, match="unexpected definition"):
            database._ensure_unique_sqlite_index(
                connection,
                table_name="debate_arguments",
                index_name="uq_debate_argument_turn_order",
                columns=("debate_id", "turn_order"),
            )
    engine.dispose()
