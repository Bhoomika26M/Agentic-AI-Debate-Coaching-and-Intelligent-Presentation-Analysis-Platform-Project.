import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "DebateIQ"
    PROJECT_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    USE_SQLITE: bool = True
    DATABASE_URL: str = "sqlite:///./debateiq.db"

    # Security
    JWT_SECRET_KEY: str = "debateiq-super-secure-production-jwt-token-key-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth2 Google (Mockable / Pluggable)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # AI & LLM Provider
    LLM_PROVIDER: str = "mock"  # 'mock' or 'gemini'
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Configurable Scoring Constants (Exact Weighted Model)
    WEIGHT_ARGUMENT_QUALITY: float = 0.30
    WEIGHT_EVIDENCE_USAGE: float = 0.20
    WEIGHT_LOGICAL_CONSISTENCY: float = 0.20
    WEIGHT_REBUTTAL_EFFECTIVENESS: float = 0.15
    WEIGHT_COMMUNICATION_SKILLS: float = 0.15

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def effective_db_url(self) -> str:
        if self.USE_SQLITE:
            return "sqlite:///./debateiq.db"
        return self.DATABASE_URL

settings = Settings()
