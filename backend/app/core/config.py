from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    NVIDIA_API_KEY: str = ""
    NVIDIA_TEXT_MODEL: str = "nvidia/nemotron-3.5-super-vl-120b-a12b"

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache
def get_settings() -> Settings:
    return Settings()