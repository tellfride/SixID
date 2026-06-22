from datetime import timezone, timedelta

from pydantic_settings import BaseSettings

TIMEZONE_BR = timezone(timedelta(hours=-3))


class Settings(BaseSettings):
    APP_NAME: str = "SixiD"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./sysid9.db"

    SECRET_KEY: str = "change-this-to-a-secure-random-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    AGENT_API_KEY: str = "dev-agent-key-2024"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
