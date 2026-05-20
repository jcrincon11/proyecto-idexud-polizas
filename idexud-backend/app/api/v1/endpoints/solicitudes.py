"""
app/routers/solicitudes.py
===========================
Router dedicado al flujo de BORRADOR (etapa PMO).
Completamente independiente de /polizas para no romper nada existente.

Registro en main.py:
  from app.routers.solicitudes import router as solicitudes_router
  app.include_router(solicitudes_router, prefix="/api/v1")

Endpoint expuesto:
  POST  /api/v1/solicitudes          ← PMO crea solicitud inicial
  GET   /api/v1/solicitudes/{id}     ← Consultar una solicitud
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ── Ajusta estos imports a tu estructura de carpetas real ──────────
# from app.core.database import get_db
# from app.models.poliza import Poliza, EstadoPoliza
# from app.schemas.solicitud import SolicitudCreate, SolicitudResponse, generar_numero_radicado

# Para que el archivo sea autónomo en el ejemplo, los dejamos como
# referencias comentadas. El bloque de código real está abajo.

router = APIRouter(
    prefix="/solicitudes",
    tags=["Solicitudes (PMO — Borrador)"],
)


# ── Importa tus dependencias reales ──────────────────────────────
# Descomenta y ajusta estos imports según tu estructura:
#
#   from app.core.database import get_db
#   from app.models.poliza  import Poliza, EstadoPoliza
#   from app.schemas.solicitud import (
#       SolicitudCreate, SolicitudResponse, generar_numero_radicado
#   )


@router.post(
    "",
    response_model=None,      # Cambia a SolicitudResponse cuando importes el schema
    status_code=status.HTTP_201_CREATED,
    summary="Crear solicitud inicial (PMO)",
    description=(
        "Crea una póliza en estado BORRADOR con los datos mínimos que PMO ingresa. "
        "No requiere aseguradora, contratista ni número de póliza. "
        "Retorna el ID y número de radicado para mostrar el ticket de confirmación."
    ),
)
async def crear_solicitud(
    data: dict,           # Reemplaza con: data: SolicitudCreate
    db: AsyncSession = Depends(lambda: None),   # Reemplaza con: Depends(get_db)
):
    """
    ╔══════════════════════════════════════════════════════════╗
    ║  CÓDIGO LISTO PARA COPIAR — ajusta los 3 imports reales ║
    ╚══════════════════════════════════════════════════════════╝

    Reemplaza este docstring por el código de abajo una vez que
    tengas los imports reales de tu proyecto.
    """
    pass


# ════════════════════════════════════════════════════════════════════
# CÓDIGO REAL DEL ENDPOINT — copia esto dentro de `crear_solicitud`
# una vez que tengas los imports configurados.
# ════════════════════════════════════════════════════════════════════
"""
IMPLEMENTACIÓN REAL (pega esto en tu archivo con los imports correctos):

@router.post("", response_model=SolicitudResponse, status_code=201)
async def crear_solicitud(
    data: SolicitudCreate,
    db: AsyncSession = Depends(get_db),
):
    # 1. Crear el objeto ORM con solo los campos que PMO llena
    nueva_poliza = Poliza(
        descripcion      = data.descripcion,
        tipo_garantia    = data.tipo_garantia,
        enlace_nextcloud = data.enlace_nextcloud,
        monto_asegurado  = data.monto_asegurado,
        estado           = EstadoPoliza.BORRADOR,      # ← Siempre BORRADOR al crear
        # Campos obligatorios en la DB pero opcionales en este flujo:
        numero_poliza    = None,
        vigencia_desde   = None,
        vigencia_hasta   = None,
        aseguradora_id   = None,
        contratista_id   = None,
    )

    db.add(nueva_poliza)

    # 2. flush() para que la DB asigne el id sin cerrar la transacción
    await db.flush()

    # 3. Generar el número de radicado con el id ya asignado
    nueva_poliza.numero_radicado = generar_numero_radicado(nueva_poliza.id)

    # 4. Commit definitivo
    await db.commit()
    await db.refresh(nueva_poliza)

    return nueva_poliza


@router.get("/{solicitud_id}", response_model=SolicitudResponse)
async def obtener_solicitud(
    solicitud_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Poliza).where(Poliza.id == solicitud_id)
    )
    poliza = result.scalar_one_or_none()
    if not poliza:
        raise HTTPException(
            status_code=404,
            detail=f"Solicitud {solicitud_id} no encontrada."
        )
    return poliza
"""


# ════════════════════════════════════════════════════════════════════
# MANEJO DE ERRORES 422 — middleware de respuesta legible
# Agrega esto en main.py para que el frontend vea los detalles del
# error de validación en lugar de un objeto críptico.
# ════════════════════════════════════════════════════════════════════
"""
# En main.py:
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errores = []
    for error in exc.errors():
        campo = " → ".join(str(loc) for loc in error["loc"] if loc != "body")
        errores.append({
            "campo":   campo or "body",
            "mensaje": error["msg"],
            "valor":   str(error.get("input", ""))[:100],
        })
    return JSONResponse(
        status_code=422,
        content={
            "detail":  "Error de validación en los datos enviados.",
            "errores": errores,
        },
    )
"""
