import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agentic AI Debate Coach"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # PostgreSQL Primary Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")  # Using SQLite for dev convenience, switch to PG in prod

settings = Settings()
