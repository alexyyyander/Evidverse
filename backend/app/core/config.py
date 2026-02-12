from typing import Any, Dict, List, Optional, Union
import json
from pydantic import PostgresDsn, validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vidgit"
    API_V1_STR: str = "/api/v1"
    
    # JWT
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: str = "5432"
    
    SQLALCHEMY_DATABASE_URI: Optional[Union[str, PostgresDsn]] = None

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=values.get("POSTGRES_USER"),
            password=values.get("POSTGRES_PASSWORD"),
            host=values.get("POSTGRES_SERVER"),
            port=int(values.get("POSTGRES_PORT")),
            path=f"{values.get('POSTGRES_DB') or ''}",
        )
    
    # Celery
    CELERY_BROKER_URL: str = "amqp://guest:guest@localhost:5672//"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Storage (S3/MinIO)
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "vidgit-bucket"
    S3_REGION_NAME: str = "us-east-1"

    # Seedance AI
    SEEDANCE_API_KEY: str = "sk-test-seedance-api-key"
    SEEDANCE_API_URL: str = "https://api.seedance.com/v1"

    # Stability AI (Stable Diffusion)
    STABILITY_API_KEY: str = "sk-test-stability-api-key"
    STABILITY_API_HOST: str = "https://api.stability.ai"

    # OpenAI
    OPENAI_API_KEY: str = "sk-test-openai-api-key"

    BACKEND_CORS_ORIGINS: List[str] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(i).rstrip("/") for i in v if str(i).strip()]
        if isinstance(v, str):
            raw = v.strip()
            if not raw:
                return []
            if raw.startswith("["):
                try:
                    items = json.loads(raw)
                    if isinstance(items, list):
                        return [str(i).rstrip("/") for i in items if str(i).strip()]
                except Exception:
                    return []
            return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
        return []

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
