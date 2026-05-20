"""
app/api/v1/endpoints/cartera.py
=================================
Router FastAPI para el módulo de Cartera.

Endpoints expuestos bajo el prefijo /api/v1/cartera:

  GET  /        → Listar registros de cartera (proyección sobre polizas + aseguradoras)
  GET  /{id}    → Obtener detalle de un registro de cartera
  PATCH /{id}   → Actualizar estado, orden de pago y soporte documental

El módulo de Cartera NO tiene tabla propia: es una vista enriquecida de la
tabla polizas que permite al área financiera gestionar el reintegro de primas.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.poliza import EstadoCartera, Poliza
from app.schemas.cartera import CarteraListResponse, CarteraResponse, CarteraUpdate

router = APIRouter(prefix="/cartera", tags=["Cartera"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


# ═══════════════════════════════════════════════════════════════════════════════
# GET /cartera/ — Listar registros de cartera
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/",
    response_model=CarteraListResponse,
    summary="Listar registros de cartera",
    description=(
        "Retorna la lista de pólizas con sus datos de cartera. "
        "Se puede filtrar por estado_cartera y hacer búsqueda libre."
    ),
)
async def listar_cartera(
    db: DbSession,
    estado: Annotated[
        EstadoCartera | None,
        Query(description="Filtrar por estado: PENDIENTE_REINTEGRO, ABONADO, PAGADO, NO_APLICA"),
    ] = None,
    busqueda: Annotated[
        str | None,
        Query(min_length=2, description="Búsqueda en número de póliza, aseguradora o centro de costos"),
    ] = None,
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 50,
) -> CarteraListResponse:
    stmt = (
        select(Poliza)
        .options(selectinload(Poliza.aseguradora))
        .order_by(Poliza.created_at.desc())
    )

    if estado is not None:
        stmt = stmt.where(Poliza.estado_cartera == estado)

    if busqueda:
        q = f"%{busqueda}%"
        from sqlalchemy import or_
        from app.models.aseguradora import Aseguradora
        stmt = stmt.join(Aseguradora, Poliza.aseguradora_id == Aseguradora.id, isouter=True).where(
            or_(
                Poliza.numero_poliza.ilike(q),
                Poliza.centro_costo_solicitante.ilike(q),
                Poliza.centro_costo_pagador.ilike(q),
                Aseguradora.nombre.ilike(q),
            )
        )

    # Conteo total para paginación
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total: int = (await db.execute(count_stmt)).scalar_one()

    # Paginación
    offset = (pagina - 1) * por_pagina
    stmt = stmt.offset(offset).limit(por_pagina)

    result = await db.execute(stmt)
    polizas = result.scalars().all()

    return CarteraListResponse(
        items=[CarteraResponse.from_poliza(p) for p in polizas],
        total=total,
        pagina=pagina,
        por_pagina=por_pagina,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# GET /cartera/{id} — Detalle de un registro
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/{cartera_id}",
    response_model=CarteraResponse,
    summary="Obtener detalle de cartera",
)
async def obtener_cartera(cartera_id: int, db: DbSession) -> CarteraResponse:
    poliza = (await db.execute(
        select(Poliza)
        .options(selectinload(Poliza.aseguradora))
        .where(Poliza.id == cartera_id)
    )).scalar_one_or_none()

    if poliza is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un registro de cartera con ID {cartera_id}.",
        )

    return CarteraResponse.from_poliza(poliza)


# ═══════════════════════════════════════════════════════════════════════════════
# PATCH /cartera/{id} — Actualizar datos de cartera
# ═══════════════════════════════════════════════════════════════════════════════

@router.patch(
    "/{cartera_id}",
    response_model=CarteraResponse,
    summary="Actualizar registro de cartera",
    description=(
        "Actualiza el estado de cartera, orden de pago, fecha y enlace de soporte. "
        "Solo se modifican los campos enviados (PATCH semántico)."
    ),
)
async def actualizar_cartera(
    cartera_id: int,
    payload: CarteraUpdate,
    db: DbSession,
) -> CarteraResponse:
    poliza = (await db.execute(
        select(Poliza)
        .options(selectinload(Poliza.aseguradora))
        .where(Poliza.id == cartera_id)
    )).scalar_one_or_none()

    if poliza is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un registro de cartera con ID {cartera_id}.",
        )

    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El body está vacío. Envíe al menos un campo para actualizar.",
        )

    for campo, valor in cambios.items():
        setattr(poliza, campo, valor)

    await db.commit()
    await db.refresh(poliza)

    return CarteraResponse.from_poliza(poliza)
