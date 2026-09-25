from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./debate_coach.db"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 1440
    allow_origins: str = "http://localhost:3000,http://localhost:8000"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 100
    whisper_model: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [x.strip() for x in self.allow_origins.split(",") if x.strip()]

    @property
    def groq_enabled(self) -> bool:
        return bool(self.groq_api_key.strip())


settings = Settings()
