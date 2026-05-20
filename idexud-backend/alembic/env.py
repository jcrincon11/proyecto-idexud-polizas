"""
alembic/env.py
==============
Punto de entrada de Alembic. Este archivo orquesta cómo se ejecutan
las migraciones, tanto en modo "offline" (solo genera SQL) como en
modo "online" (aplica cambios directamente a la DB).

Decisiones de diseño:
  ✅ La URL se lee de settings.DATABASE_URL_SYNC (psycopg2, síncrono).
     Alembic no soporta drivers async de forma nativa.
  ✅ Base.metadata se importa aquí para que --autogenerate compare
     el estado actual de los modelos contra la DB real.
  ✅ Se importa app.models (el __init__.py) para registrar TODOS los
     modelos antes de la comparación. Sin esto, autogenerate no ve
     las tablas y genera migraciones vacías.
  ✅ include_schemas=True para que Alembic gestione múltiples esquemas
     de Postgres si en el futuro se segmenta la DB por módulo.
"""

import logging
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, text

from alembic import context

# ─── Imports del proyecto ────────────────────────────────────────────────────
# ORDEN IMPORTANTE:
#   1. config  → disponible para DATABASE_URL_SYNC
#   2. Base    → metadata con la definición de todas las tablas
#   3. models  → registra cada modelo en Base.metadata (efecto de importar)

from app.core.config import settings      # Lee el .env
from app.db.base import Base              # DeclarativeBase
import app.models                         # noqa: F401 — registra las 7 tablas

# ─────────────────────────────────────────────────────────────────────────────
# Configuración de Alembic
# ─────────────────────────────────────────────────────────────────────────────

alembic_config = context.config

# Sobreescribir sqlalchemy.url con el valor real del .env
# (la línea sqlalchemy.url del .ini queda vacía a propósito)
alembic_config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)

# Activar el logging definido en el [loggers] del alembic.ini
if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

logger = logging.getLogger("alembic.env")

# Metadata que Alembic usará para el autogenerate (comparar modelos vs DB)
target_metadata = Base.metadata


# ─────────────────────────────────────────────────────────────────────────────
# Helpers de comparación (autogenerate más inteligente)
# ─────────────────────────────────────────────────────────────────────────────

def include_object(object, name, type_, reflected, compare_to):
    """
    Filtra qué objetos de la DB incluye autogenerate en la comparación.

    - Excluye la tabla interna 'spatial_ref_sys' de PostGIS si se instala.
    - Excluye tablas de extensiones de Postgres que no son nuestras.
    - Incluye todo lo demás.
    """
    # Tablas de extensiones de Postgres que no debemos tocar
    EXCLUDED_TABLES = {"spatial_ref_sys", "geography_columns", "geometry_columns"}

    if type_ == "table" and name in EXCLUDED_TABLES:
        return False
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Modo OFFLINE: genera el SQL sin conectarse a la DB
# Útil para generar scripts .sql para revisión del DBA antes de aplicar.
#
# Ejecutar con:
#   alembic upgrade head --sql > migration.sql
# ─────────────────────────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    url = alembic_config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,        # Detecta cambios de tipo de columna
        compare_server_default=True,  # Detecta cambios en DEFAULT
        render_as_batch=False,    # False = Postgres soporta ALTER directo
    )

    with context.begin_transaction():
        context.run_migrations()


# ─────────────────────────────────────────────────────────────────────────────
# Modo ONLINE: se conecta a la DB y aplica los cambios directamente
# Es el modo por defecto al ejecutar `alembic upgrade head`
# ─────────────────────────────────────────────────────────────────────────────

def run_migrations_online() -> None:
    """
    Crea el engine síncrono (psycopg2) y ejecuta las migraciones.
    El engine usa NullPool para no mantener conexiones abiertas
    entre el proceso de migración y la app principal.
    """
    connectable = engine_from_config(
        alembic_config.get_section(alembic_config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Verificar conectividad antes de proceder
        connection.execute(text("SELECT 1"))
        logger.info(
            "✅ Conexión a PostgreSQL establecida: %s:%s/%s",
            settings.POSTGRES_HOST,
            settings.POSTGRES_PORT,
            settings.POSTGRES_DB or "idexud_polizas",
        )

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
            render_as_batch=False,
            # Nombre de la tabla donde Alembic guarda el historial de migraciones
            version_table="alembic_version",
        )

        with context.begin_transaction():
            context.run_migrations()


# ─────────────────────────────────────────────────────────────────────────────
# Punto de entrada — Alembic llama a este bloque automáticamente
# ─────────────────────────────────────────────────────────────────────────────

if context.is_offline_mode():
    logger.info("Ejecutando migraciones en modo OFFLINE (solo SQL)")
    run_migrations_offline()
else:
    logger.info("Ejecutando migraciones en modo ONLINE")
    run_migrations_online()
