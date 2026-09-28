import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, AliasChoices, field_validator

class Settings(BaseSettings):
    APP_NAME: str = "SentinelAid AI"
    APP_ENV: str = "development"
    DEBUG: bool = Field(default=True, validation_alias=AliasChoices("SENTINELAID_DEBUG", "DEBUG"))
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = Field(
        default="mysql+pymysql://root:root@localhost:3306/sentinelaid",
        description="MySQL connection string or SQLite fallback"
    )
    SQL_ECHO: bool = False

    # Security & JWT
    JWT_SECRET_KEY: str = Field(default="sentinelaid-top-secret-super-secure-jwt-key-2026-xyz", description="JWT secret")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000"
    ]

    # File Storage
    UPLOAD_DIR: str = "uploads"
    PROCESSED_DIR: str = "processed"
    REPORT_DIR: str = "reports"

    # External Satellite & AI Config
    NASA_API_KEY: str = ""
    USGS_API_KEY: str = ""
    COPERNICUS_CLIENT_ID: str = ""
    COPERNICUS_CLIENT_SECRET: str = ""
    PLANETARY_COMPUTER_URL: str = "https://planetarycomputer.microsoft.com/api/stac/v1"
    ROUTING_PROVIDER_URL: str = ""
    ROUTING_PROVIDER_KEY: str = ""
    AI_MODEL_PATH: str = ""

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        if isinstance(value, str) and value.lower() in ("release", "production"):
            return False
        return value

    class Config:
        env_file = str(Path(__file__).resolve().parents[2] / ".env")
        extra = "ignore"

settings = Settings()
