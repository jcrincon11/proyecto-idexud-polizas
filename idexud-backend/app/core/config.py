from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "IDEXUD Pólizas"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    AMBIENTE: str = "development"

    # Base de Datos (driver async para la app, sync para Alembic)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/idexud_polizas"

    # Variables individuales de Postgres (opcionales — usadas en docker-compose)
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Seguridad — API Key para operaciones de escritura (POST/PATCH/DELETE).
    # Cambiar por un valor largo y aleatorio antes de pasar a producción.
    # Generar con: python -c "import secrets; print(secrets.token_urlsafe(32))"
    API_KEY: str = "CAMBIAR-EN-PRODUCCION-usar-secrets.token_urlsafe-32"

    # CORS — nunca colocar "*" en producción; lista los orígenes del frontend real.
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def is_development(self) -> bool:
        return self.AMBIENTE == "development"

    @property
    def is_production(self) -> bool:
        return self.AMBIENTE == "production"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        """URL síncrona (psycopg2) requerida por Alembic — elimina el driver async."""
        return self.DATABASE_URL.replace("+asyncpg", "").replace("+aiopg", "")

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()