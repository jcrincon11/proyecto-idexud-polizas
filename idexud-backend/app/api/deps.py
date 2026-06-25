"""
app/api/deps.py
===============
Dependencias inyectables de FastAPI (Depends).

Centralizar aquí las dependencias evita importar get_db desde session.py
directamente en cada endpoint, facilitando mocks en tests.
"""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Inyecta una sesión de base de datos por request.
    La sesión se cierra automáticamente al terminar (éxito o error).
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> dict:
    """
    Capa de autenticación mediante API Key.

    Valida el encabezado HTTP 'X-API-Key' contra settings.API_KEY.
    Todos los endpoints de escritura (POST/PATCH/DELETE) dependen de esta función.

    Hoja de ruta hacia JWT:
      Cuando el área de TI configure el proveedor de identidad (Keycloak / Auth0),
      reemplazar esta función por la validación del Bearer token:
          payload = jwt.decode(token, settings.SECRET_KEY, ...)
          return {"email": payload["sub"], "nombre": ..., "rol": ...}
      Los endpoints que usan 'CurrentUser' no necesitarán ningún cambio adicional.
    """
    if not x_api_key or x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Acceso no autorizado. Se requiere el encabezado "
                "'X-API-Key' con una clave válida."
            ),
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return {
        "email": "admin@idexud.edu.co",
        "nombre": "Administrador IDEXUD",
        "rol": "ADMIN",
    }


# Alias de tipo — facilita la firma de los endpoints:
#   async def crear_poliza(..., current_user: CurrentUser): ...
CurrentUser = Annotated[dict, Depends(get_current_user)]
