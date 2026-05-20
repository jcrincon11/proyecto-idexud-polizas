"""
app/db/session.py
=================
Configura el motor asíncrono de SQLAlchemy y la fábrica de sesiones.

Componentes exportados:
  - engine              → Motor async (una instancia global para toda la app)
  - AsyncSessionLocal   → Fábrica de sesiones async
  - get_db              → Dependencia inyectable de FastAPI (yield session)
  - init_db             → Crea las tablas en DB (útil en desarrollo sin Alembic)

Diagrama de uso en un request FastAPI:
  Request → Endpoint → Depends(get_db) → sesión abierta
                                       ↓
                             lógica de negocio / queries
                                       ↓
                             commit / rollback automático
                                       ↓
                             sesión cerrada (finally)
"""

from collections.abc import AsyncGenerator

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.base import Base


# ─────────────────────────────────────────────────────────────────────────────
# Motor asíncrono
# ─────────────────────────────────────────────────────────────────────────────

def _build_engine() -> AsyncEngine:
    """
    Construye el motor con parámetros ajustados según el entorno.

    Parámetros clave:
      pool_size        → Conexiones permanentes en el pool
      max_overflow     → Conexiones adicionales permitidas bajo carga
      pool_timeout     → Segundos de espera antes de lanzar TimeoutError
      pool_recycle     → Recicla conexiones (evita cortes por timeout del servidor)
      pool_pre_ping    → Verifica conexiones "muertas" antes de usarlas
      echo             → Imprime el SQL generado (solo en desarrollo)
    """
    common_kwargs = {
        "url": settings.DATABASE_URL,
        "pool_pre_ping": True,          # Detecta conexiones caídas automáticamente
        "pool_recycle": 1800,           # 30 min: rota conexiones antes que Postgres las corte
        "echo": settings.is_development,  # SQL logging solo en dev
        "echo_pool": False,
    }

    if settings.is_production:
        # En producción: pool con tamaño controlado y sin overflow descontrolado
        return create_async_engine(
            **common_kwargs,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
        )
    else:
        # En desarrollo/tests: NullPool evita problemas con event loops en pytest
        return create_async_engine(
            **common_kwargs,
            poolclass=NullPool,
        )


engine: AsyncEngine = _build_engine()


# ─────────────────────────────────────────────────────────────────────────────
# Fábrica de sesiones
# ─────────────────────────────────────────────────────────────────────────────

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,   # Los objetos no expiran tras commit (más seguro en async)
    autocommit=False,         # Commit explícito siempre
    autoflush=False,          # Flush manual para controlar exactamente cuándo se escribe
)


# ─────────────────────────────────────────────────────────────────────────────
# Dependencia inyectable para FastAPI
# ─────────────────────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependencia estándar de FastAPI para inyectar una sesión de base de datos.

    Garantías:
      ✅ La sesión se cierra siempre (incluso si el endpoint lanza una excepción).
      ✅ Se hace rollback automático ante cualquier error no manejado.
      ✅ El commit es RESPONSABILIDAD del service/endpoint (no ocurre aquí).

    Uso en un endpoint:
        from fastapi import Depends
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.db.session import get_db

        @router.get("/polizas")
        async def listar_polizas(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except SQLAlchemyError as exc:
            await session.rollback()
            raise exc
        finally:
            await session.close()


# ─────────────────────────────────────────────────────────────────────────────
# Inicialización de tablas (desarrollo sin Alembic)
# ─────────────────────────────────────────────────────────────────────────────

async def init_db() -> None:
    """
    Crea todas las tablas definidas en los modelos si no existen.

    ⚠️  Solo usar en desarrollo o en el script de arranque inicial.
        En staging/producción, las migraciones se manejan con Alembic:
        $ alembic upgrade head

    Se llama desde app/main.py en el evento de startup:
        @app.on_event("startup")
        async def on_startup():
            await init_db()
    """
    # Importar __init__ de models para que todos los modelos
    # queden registrados en Base.metadata antes de create_all
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_db() -> None:
    """
    Elimina todas las tablas. SOLO para tests o reset total en desarrollo.
    Jamás llamar en producción.
    """
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
