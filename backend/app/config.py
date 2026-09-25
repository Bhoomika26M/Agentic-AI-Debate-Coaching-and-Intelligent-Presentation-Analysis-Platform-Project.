from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./debate_coach.db"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 1440
    allow_origins: str = "http://localhost:3000,http://localhost:8000"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 100
    whisper_model: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [x.strip() for x in self.allow_origins.split(",") if x.strip()]

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key.strip())


settings = Settings()
