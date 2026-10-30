from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./debate_coach.db"
    secret_key: str = "change_this_secret_key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173"
    environment: str = "development"
    frontend_base_url: str = "http://localhost:5173"
    email_backend: str = "console"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@example.com"
    smtp_use_tls: bool = True
    password_reset_token_ttl_minutes: int = 15
    password_reset_debug_mode: bool = False
    llm_provider: str = "gemini"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str | None = None
    llm_timeout_seconds: int = 15
    llm_max_context_messages: int = Field(default=20, ge=2, le=100)
    openai_transcription_model: str = "whisper-1"
    presentation_upload_directory: str = "presentation_uploads"
    presentation_max_upload_bytes: int = Field(default=25 * 1024 * 1024, ge=1024, le=100 * 1024 * 1024)

    model_config = SettingsConfigDict(env_file=(".env", "backend/.env", "../backend/.env"), extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
