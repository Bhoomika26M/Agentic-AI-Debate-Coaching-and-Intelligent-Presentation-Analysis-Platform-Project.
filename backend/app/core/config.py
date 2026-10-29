from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables and .env file.
    Includes database connection, JWT security parameters, and Agentic AI LLM provider keys.
    """
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Database — defaults to local SQLite fallback for instant zero-config setup
    DATABASE_URL: str = "sqlite+aiosqlite:///./debate.db"

    # JWT Authentication
    SECRET_KEY: str = "debate-coach-ai-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Agentic AI / LLM Configuration
    # Supported providers: 'gemini' (Google Gemini API), 'openai' (OpenAI API / Compatible), 'auto', or 'heuristic'
    AI_PROVIDER: str = "auto"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"

    # App Settings
    APP_NAME: str = "DebateCoach AI"
    FRONTEND_URL: str = "http://localhost:5173"
    DEBUG: bool = True


settings = Settings()
