from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "AttendX - Smart Attendance Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://attendx:attendx_secure_pass_2026@127.0.0.1:5432/attendx",
        description="Async PostgreSQL connection URL",
    )
    DATABASE_URL_SYNC: str = Field(
        default="postgresql://attendx:attendx_secure_pass_2026@127.0.0.1:5432/attendx",
        description="Sync PostgreSQL connection URL for Alembic",
    )
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # Redis
    REDIS_URL: str = "redis://127.0.0.1:6379/0"

    # Celery — separate Redis logical DBs keep broker traffic out of the
    # QR-challenge / session keyspace used by the API.
    CELERY_BROKER_URL: str = "redis://127.0.0.1:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://127.0.0.1:6379/2"

    # Security & Session Authentication
    SECRET_KEY: str = "attendx_super_secret_cryptographic_key_change_in_production_9876543210"
    SESSION_COOKIE_NAME: str = "attendx_session"
    SESSION_MAX_AGE_SECONDS: int = 86400 * 7  # 7 days
    COOKIE_SECURE: bool = False  # Set to True in HTTPS production
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Optional[str] = None
    CSRF_HEADER_NAME: str = "X-CSRF-Token"

    # Dynamic QR Code Settings
    QR_DEFAULT_ROTATION_SECONDS: int = 10
    QR_GRACE_PERIOD_SECONDS: int = 5  # Allow network delay acceptance
    QR_SECRET_SALT: str = "attendx_qr_dynamic_salt_val_2026"

    # Default Attendance Policy Settings
    DEFAULT_MINIMUM_ATTENDANCE_PERCENTAGE: float = 75.0
    DEFAULT_LATE_WEIGHT: float = 0.5  # 0.5 or 1.0
    DEFAULT_ALLOWED_LATE_MINUTES: int = 15

    # SMTP / Email
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@attendx.university.edu"
    SMTP_FROM_NAME: str = "AttendX University System"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


settings = Settings()
