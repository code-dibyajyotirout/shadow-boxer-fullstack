import os
from typing import List

try:
    from pydantic_settings import BaseSettings
    class Settings(BaseSettings):
        PROJECT_NAME: str = "Shadow Boxer Distributed Backend"
        VERSION: str = "1.0.0"
        API_V1_PREFIX: str = "/api/v1"
        BACKEND_CORS_ORIGINS: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://shadowboxer.animatrous.com",
        ]
        DATABASE_URL: str = "sqlite+aiosqlite:///./shadowboxer.db"
        REDIS_URL: str = "redis://localhost:6379/0"
        REDIS_LEADERBOARD_KEY: str = "shadowboxer:leaderboard"
        REDIS_CACHE_TTL_SECONDS: int = 3600

        class Config:
            case_sensitive = True
            extra = "allow"
except ImportError:
    class Settings:
        PROJECT_NAME: str = "Shadow Boxer Distributed Backend"
        VERSION: str = "1.0.0"
        API_V1_PREFIX: str = "/api/v1"
        BACKEND_CORS_ORIGINS: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://shadowboxer.animatrous.com",
        ]
        DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./shadowboxer.db")
        REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        REDIS_LEADERBOARD_KEY: str = "shadowboxer:leaderboard"
        REDIS_CACHE_TTL_SECONDS: int = 3600

    # PostgreSQL Connection
    DATABASE_URL: str = "sqlite+aiosqlite:///./shadowboxer.db"
    
    # Redis Cache Connection
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_LEADERBOARD_KEY: str = "shadowboxer:leaderboard"
    REDIS_CACHE_TTL_SECONDS: int = 3600

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
