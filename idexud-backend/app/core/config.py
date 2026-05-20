from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "IDEXUD Pólizas"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    AMBIENTE: str = "development"
    
    # Base de Datos 
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/idexud_polizas"

    # Vacuna para que Pydantic no pelee con tu archivo .env
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]

    @property
    def is_development(self) -> bool:
        return self.AMBIENTE == "development"

    @property
    def is_production(self) -> bool: # <--- Esto es lo que le faltaba a tu archivo
        return self.AMBIENTE == "production"

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore" # <--- MAGIA: Ignora la basura del .env

settings = Settings()