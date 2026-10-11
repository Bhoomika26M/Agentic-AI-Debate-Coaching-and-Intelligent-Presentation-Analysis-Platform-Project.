
from pymongo import MongoClient
from pymongo.errors import PyMongoError

MONGODB_URL = "mongodb://localhost:27017"

client = MongoClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=5000,
)

database = client["debate_coach_ai"]
analysis_collection = database["analysis_results"]


def check_mongodb_connection() -> bool:
    try:
        client.admin.command("ping")
        return True
    except PyMongoError:
        return False
