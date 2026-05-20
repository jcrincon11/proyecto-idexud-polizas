"""
app/api/v1/endpoints/polizas.py
================================
Router FastAPI para el recurso Póliza.

Endpoints expuestos bajo el prefijo /api/v1/polizas:

  GET    /                  → Listar con filtros y paginación
  POST   /                  → Crear nueva póliza
  GET    /{id}              → Obtener detalle completo (con relaciones)
  PATCH  /{id}              → Actualizar parcialmente
  DELETE /{id}              → Anular (eliminación lógica)
  GET    /dashboard/stats   → Estadísticas para el panel de control

Convenciones:
  - La sesión de DB se inyecta via Depends(get_db).
  - El servicio se construye dentro de cada endpoint (no como Depends)
    para mantenerlo testeable sin FastAPI.
  - Los responses_model usan los schemas Pydantic v2 de app/schemas/poliza.py.
  - Los errores usan HTTPException con mensajes descriptivos en español.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.poliza import EstadoPoliza, TipoPoliza
from app.schemas.poliza import (
    PolizaCreate,
    PolizaListResponse,
    PolizaResponse,
    PolizaResponseDetalle,
    PolizaUpdate,
)
from app.services.poliza_service import PolizaService

router = APIRouter(
    prefix="/polizas",
    tags=["Pólizas"],
)

# Alias para el tipo de sesión inyectada (más limpio que repetirlo)
DbSession = Annotated[AsyncSession, Depends(get_db)]


# ═════════════════════════════════════════════════════════════════════════════
# GET /polizas — Listar con filtros y paginación
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/",
    response_model=PolizaListResponse,
    summary="Listar pólizas",
    description=(
        "Retorna un listado paginado de pólizas. "
        "Se pueden combinar múltiples filtros simultáneamente."
    ),
)
async def listar_polizas(
    db: DbSession,
    # ── Paginación ────────────────────────────────────────────────────────────
    pagina: Annotated[int, Query(ge=1, description="Número de página (mínimo 1).")] = 1,
    por_pagina: Annotated[
        int, Query(ge=1, le=100, description="Registros por página (máximo 100).")
    ] = 20,
    # ── Filtros exactos ───────────────────────────────────────────────────────
    tipo: Annotated[
        TipoPoliza | None,
        Query(description="Filtrar por tipo: CUMPLIMIENTO, RCE, etc."),
    ] = None,
    estado: Annotated[
        EstadoPoliza | None,
        Query(description="Filtrar por estado: ACTIVA, POR_VENCER, VENCIDA, etc."),
    ] = None,
    aseguradora_id: Annotated[
        int | None, Query(gt=0, description="ID de la aseguradora.")
    ] = None,
    contratista_id: Annotated[
        int | None, Query(gt=0, description="ID del contratista.")
    ] = None,
    numero_contrato: Annotated[
        str | None,
        Query(description="Buscar por número de contrato (búsqueda parcial)."),
    ] = None,
    # ── Filtros de fechas ─────────────────────────────────────────────────────
    vence_antes_de: Annotated[
        date | None,
        Query(description="Pólizas que vencen ANTES de esta fecha (ISO: YYYY-MM-DD)."),
    ] = None,
    vence_despues_de: Annotated[
        date | None,
        Query(description="Pólizas que vencen DESPUÉS de esta fecha (ISO: YYYY-MM-DD)."),
    ] = None,
    solo_por_vencer_dias: Annotated[
        int | None,
        Query(
            ge=1, le=365,
            description="Solo pólizas activas que vencen en los próximos N días.",
        ),
    ] = None,
    # ── Búsqueda libre ────────────────────────────────────────────────────────
    busqueda: Annotated[
        str | None,
        Query(
            min_length=2,
            description=(
                "Búsqueda de texto libre en número de póliza, "
                "número de contrato y objeto del contrato."
            ),
        ),
    ] = None,
) -> PolizaListResponse:
    service = PolizaService(db)
    return await service.listar(
        pagina=pagina,
        por_pagina=por_pagina,
        tipo=tipo,
        estado=estado,
        aseguradora_id=aseguradora_id,
        contratista_id=contratista_id,
        numero_contrato=numero_contrato,
        vence_antes_de=vence_antes_de,
        vence_despues_de=vence_despues_de,
        solo_por_vencer_dias=solo_por_vencer_dias,
        busqueda=busqueda,
    )


# ═════════════════════════════════════════════════════════════════════════════
# POST /polizas — Crear nueva póliza
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/",
    response_model=PolizaResponseDetalle,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nueva póliza",
    description=(
        "Crea una nueva póliza en estado BORRADOR y genera automáticamente "
        "su checklist de expedición con los 10 pasos en estado pendiente."
    ),
)
async def crear_poliza(
    payload: PolizaCreate,
    db: DbSession,
) -> PolizaResponseDetalle:
    service = PolizaService(db)
    return await service.crear(payload)


# ═════════════════════════════════════════════════════════════════════════════
# GET /polizas/dashboard/stats — Estadísticas para el panel de control
# IMPORTANTE: Esta ruta DEBE ir antes de /{poliza_id} para que FastAPI
# no intente parsear "dashboard" como un entero.
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/dashboard/stats",
    summary="Estadísticas del dashboard",
    description=(
        "Retorna conteos y métricas para el panel de control de Idexud: "
        "totales por estado, valor asegurado total, alertas críticas, etc."
    ),
    response_model=dict,
)
async def obtener_stats_dashboard(db: DbSession) -> dict:
    """
    Agrega estadísticas en una sola llamada para alimentar las tarjetas
    del dashboard sin múltiples requests desde el frontend.
    """
    from sqlalchemy import func, select
    from app.models.poliza import Poliza

    hoy = date.today()

    # Conteos por estado
    stmt_estados = (
        select(Poliza.estado, func.count(Poliza.id).label("cantidad"))
        .group_by(Poliza.estado)
    )
    resultado_estados = await db.execute(stmt_estados)
    conteos_estado = {row.estado.value: row.cantidad for row in resultado_estados}

    # Valor total asegurado de pólizas activas
    from sqlalchemy import cast
    from sqlalchemy import Numeric as SaNumeric
    stmt_valor = select(
        func.coalesce(func.sum(Poliza.valor_asegurado), 0)
    ).where(Poliza.estado.in_([EstadoPoliza.ACTIVA, EstadoPoliza.POR_VENCER]))
    valor_total = (await db.execute(stmt_valor)).scalar_one()

    # Pólizas críticas: vencen en los próximos 7 días
    limite_critico = date.fromordinal(hoy.toordinal() + 7)
    stmt_criticas = select(func.count(Poliza.id)).where(
        Poliza.vigencia_hasta >= hoy,
        Poliza.vigencia_hasta <= limite_critico,
        Poliza.estado.in_([EstadoPoliza.ACTIVA, EstadoPoliza.POR_VENCER]),
    )
    criticas = (await db.execute(stmt_criticas)).scalar_one()

    # Pólizas próximas: vencen entre 8 y 30 días
    limite_proximo = date.fromordinal(hoy.toordinal() + 30)
    stmt_proximas = select(func.count(Poliza.id)).where(
        Poliza.vigencia_hasta > limite_critico,
        Poliza.vigencia_hasta <= limite_proximo,
        Poliza.estado.in_([EstadoPoliza.ACTIVA, EstadoPoliza.POR_VENCER]),
    )
    proximas = (await db.execute(stmt_proximas)).scalar_one()

    from app.schemas.base import format_cop
    from decimal import Decimal

    return {
        "resumen_por_estado": conteos_estado,
        "total_polizas": sum(conteos_estado.values()),
        "valor_total_asegurado_cop": float(valor_total),
        "valor_total_asegurado_fmt": format_cop(Decimal(str(valor_total))) or "$ 0,00",
        "alertas": {
            "criticas_7_dias": criticas,
            "proximas_30_dias": proximas,
        },
        "fecha_calculo": hoy.isoformat(),
    }


# ═════════════════════════════════════════════════════════════════════════════
# GET /polizas/{poliza_id} — Obtener detalle completo
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/{poliza_id}",
    response_model=PolizaResponseDetalle,
    summary="Obtener detalle de una póliza",
    description=(
        "Retorna una póliza con todas sus relaciones anidadas: "
        "aseguradora, contratista, siniestros, checklist de expedición y alertas."
    ),
)
async def obtener_poliza(
    poliza_id: int,
    db: DbSession,
) -> PolizaResponseDetalle:
    service = PolizaService(db)
    return await service.get_por_id(poliza_id)


# ═════════════════════════════════════════════════════════════════════════════
# PATCH /polizas/{poliza_id} — Actualizar parcialmente
# ═════════════════════════════════════════════════════════════════════════════

@router.patch(
    "/{poliza_id}",
    response_model=PolizaResponseDetalle,
    summary="Actualizar póliza (parcial)",
    description=(
        "Actualiza solo los campos enviados en el cuerpo. "
        "El campo 'estado' sigue el flujo de negocio: "
        "BORRADOR → PENDIENTE_REVISION → ACTIVA → POR_VENCER | VENCIDA | RENOVADA | ANULADA."
    ),
)
async def actualizar_poliza(
    poliza_id: int,
    payload: PolizaUpdate,
    db: DbSession,
) -> PolizaResponseDetalle:
    service = PolizaService(db)
    return await service.actualizar(poliza_id, payload)


# ═════════════════════════════════════════════════════════════════════════════
# DELETE /polizas/{poliza_id} — Anular (eliminación lógica)
# ═════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/{poliza_id}",
    response_model=PolizaResponse,
    summary="Anular póliza",
    description=(
        "Marca la póliza como ANULADA (no se elimina físicamente). "
        "La trazabilidad y el historial de la póliza se conservan por requisitos "
        "de auditoría de la contratación pública colombiana. "
        "Se requiere un motivo de anulación obligatorio."
    ),
)
async def anular_poliza(
    poliza_id: int,
    db: DbSession,
    motivo: Annotated[
        str,
        Query(
            min_length=10,
            max_length=500,
            description="Motivo de la anulación (mínimo 10 caracteres).",
        ),
    ],
) -> PolizaResponse:
    service = PolizaService(db)
    return await service.anular(poliza_id, motivo)
