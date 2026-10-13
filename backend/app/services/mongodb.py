"""
MongoDB connection stub — Motor async client.

This module provides a Motor async client for MongoDB. It is intentionally
unused in Milestone 1. Wired for Milestone 2+ features:
  - Debate transcript storage
  - Argument graph persistence
  - NLP analysis results

Usage (Milestone 2+):
    from app.services.mongodb import get_mongo_db
    db = await get_mongo_db()
    await db["transcripts"].insert_one({...})
"""

from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

_client: Optional[AsyncIOMotorClient] = None


async def connect_mongodb() -> None:
    """Initialize the MongoDB connection pool."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    # Ping to verify connectivity
    await _client.admin.command("ping")
    print(f"[MongoDB] Connected to {settings.MONGODB_URL}")


async def close_mongodb() -> None:
    """Close the MongoDB connection pool."""
    global _client
    if _client:
        _client.close()
        _client = None


async def get_mongo_db() -> AsyncIOMotorDatabase:
    """
    Return the Motor database instance.
    Raises RuntimeError if not yet connected.
    """
    if _client is None:
        raise RuntimeError("MongoDB client is not initialized. Call connect_mongodb() first.")
    return _client[settings.MONGODB_DB_NAME]
