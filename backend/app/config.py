from datetime import timezone, timedelta

from pydantic_settings import BaseSettings

TIMEZONE_BR = timezone(timedelta(hours=-3))


class Settings(BaseSettings):
    APP_NAME: str = "SysID9"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "mysql+pymysql://sysid9:sysid9pass@localhost:3306/sysid9"

    SECRET_KEY: str = "change-this-to-a-secure-random-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    AGENT_API_KEY: str = "change-this-agent-key-in-production"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
