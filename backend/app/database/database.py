from collections.abc import Generator

from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import settings

client = MongoClient(settings.mongo_url)
database = client[settings.mongo_database]


def get_db() -> Generator[Database, None, None]:
    """Provide the shared MongoDB database to FastAPI routes."""
    configure_indexes(database)
    yield database


def configure_indexes(db: Database) -> None:
    db.users.create_index("email", unique=True)
    db.profiles.create_index("user_id", unique=True)
    db.skills.create_index("user_id", unique=True)
    db.participants.create_index([("debate_id", 1), ("user_id", 1)], unique=True)
    db.analysis_reports.create_index("debate_id", unique=True)
    db.simulation_reports.create_index("debate_id", unique=True)
    db.simulation_attempts.create_index([("user_id", 1), ("created_at", -1)])
