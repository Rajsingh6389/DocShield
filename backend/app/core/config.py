from pydantic_settings import BaseSettings
from pydantic import validator
from functools import lru_cache
from typing import List, Any

DEFAULT_ALLOWED_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:80",
]


class Settings(BaseSettings):
    # App
    APP_NAME: str = "DocuShield"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Security
    SECRET_KEY: str = "docushield-dev-secret-key-replace-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "pass"
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: str = "3306"
    MYSQL_DB: str = "DocuShield"
    DATABASE_URL: str = ""

    @validator("DATABASE_URL", pre=True)
    def assemble_db_url(cls, v, values):
        if v and "://" in v:
            return v
        
        # Build it safely from components
        import urllib.parse
        user = urllib.parse.quote_plus(values.get('MYSQL_USER') or "root")
        password = urllib.parse.quote_plus(values.get('MYSQL_PASSWORD') or "")
        host = values.get('MYSQL_HOST') or "localhost"
        port = values.get('MYSQL_PORT') or "3306"
        db = values.get('MYSQL_DB') or "DocuShield"
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"

    # CORS (For production, set this via environment variable as a JSON list or comma-separated string)
    ALLOWED_ORIGINS: Any = DEFAULT_ALLOWED_ORIGINS

    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            import json
            try:
                # Try JSON list first
                return json.loads(v)
            except json.JSONDecodeError:
                # Fallback to comma-separated
                return [i.strip() for i in v.split(",")]
        return v

    # File Storage
    UPLOAD_DIR: str = "data/uploads"
    HEATMAP_DIR: str = "data/heatmaps"
    REPORT_DIR: str = "data/reports"
    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "pdf", "tiff", "tif", "bmp"]

    # Analysis thresholds
    ELA_THRESHOLD: float = 0.35
    CLONE_THRESHOLD: float = 0.40
    SUSPICIOUS_THRESHOLD: float = 40.0   # fraud score % → suspicious
    FORGED_THRESHOLD: float = 70.0       # fraud score % → forged

    # Email (stub)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
