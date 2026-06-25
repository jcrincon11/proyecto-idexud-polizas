"""
scripts/seed_corredores.py
==========================
Inserta los 5 corredores de seguros reales del IDEXUD en la base de datos.

Uso:
    cd idexud-backend
    python -m scripts.seed_corredores

El script es idempotente: usa la columna `empresa` (UNIQUE) como clave de
deduplicación. Si el registro ya existe, lo omite sin lanzar error.

Requiere que la tabla `corredores` exista (migración a4f8b2c1d9e0).
"""

import asyncio
import sys
from pathlib import Path

# Permite ejecutar desde la raíz del proyecto sin instalar el paquete
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.corredor import Corredor


# ---------------------------------------------------------------------------
# Datos reales de los corredores
# ---------------------------------------------------------------------------

CORREDORES: list[dict] = [
    {
        "nombre_corredor": "Sergio Trujillo",
        "empresa": "Vision Integral Asesores",
        "ayudante_nombre": "Nathaly Barragán",
        "email_principal": "sergio.trujillo@visionasesores.com",
        "email_ayudante": "nathaly.barragan@visionasesores.com",
        "telefono_principal": "3156051926",
        "telefono_ayudante": "3196807682",
    },
    {
        "nombre_corredor": "Sandra Callejas",
        "empresa": "McAllister e Hijos Asociados Ltda.",
        "ayudante_nombre": None,
        "email_principal": "scallejas@mcallisterehijos.com",
        "email_ayudante": None,
        "telefono_principal": "3132888628",
        "telefono_ayudante": None,
    },
    {
        "nombre_corredor": "Laura Gonzalez",
        "empresa": "LHM Seguros Ltda.",
        "ayudante_nombre": "Hugo",
        "email_principal": "subgerencia@lhmseguros.com.co",
        "email_ayudante": "seguros-fianzas@lhmseguros.com.co",
        "telefono_principal": "3114749854",
        "telefono_ayudante": None,
    },
    {
        "nombre_corredor": "David Arrazola",
        "empresa": "Arrazola Seguros Ltda.",
        "ayudante_nombre": "Leonardo",
        "email_principal": "cumplimiento@arrazolaseguros.com",
        "email_ayudante": "gerencia@arrazolaseguros.com",
        "telefono_principal": "3016429490",
        "telefono_ayudante": "3166871763",
    },
    {
        "nombre_corredor": "Juan Carlos Arlantt",
        "empresa": "Promotora Nacional de Seguros",
        "ayudante_nombre": None,
        "email_principal": "juan.arlantt@pronalseg.com",
        "email_ayudante": None,
        "telefono_principal": "3158629966",
        "telefono_ayudante": None,
    },
]


# ---------------------------------------------------------------------------
# Lógica de inserción
# ---------------------------------------------------------------------------

async def seed(db: AsyncSession) -> dict:
    creados = 0
    omitidos = 0

    for datos in CORREDORES:
        existe = (
            await db.execute(
                select(Corredor).where(Corredor.empresa == datos["empresa"])
            )
        ).scalar_one_or_none()

        if existe:
            omitidos += 1
            print(f"  [SKIP]  {datos['empresa']} — ya existe (id={existe.id})")
        else:
            corredor = Corredor(**datos)
            db.add(corredor)
            await db.flush()
            creados += 1
            print(f"  [OK]    {datos['empresa']} — insertado (id={corredor.id})")

    await db.commit()
    return {"creados": creados, "omitidos": omitidos}


async def main() -> None:
    print("=" * 60)
    print("Seed: Corredores de seguros IDEXUD")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        resultado = await seed(db)

    print("-" * 60)
    print(
        f"Finalizado — creados: {resultado['creados']}, "
        f"omitidos: {resultado['omitidos']}"
    )


if __name__ == "__main__":
    asyncio.run(main())
