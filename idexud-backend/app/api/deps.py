"""
app/api/deps.py
===============
Dependencias inyectables de FastAPI (Depends).

Centralizar aquí las dependencias evita importar get_db desde session.py
directamente en cada endpoint, facilitando mocks en tests.
"""

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Inyecta una sesión de base de datos por request.
    La sesión se cierra automáticamente al terminar (éxito o error).

    Uso en endpoints:
        from app.api.deps import get_db
        async def mi_endpoint(db: AsyncSession = Depends(get_db)): ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
