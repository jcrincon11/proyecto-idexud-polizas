"""
app/api/v1/endpoints/cartera.py
=================================
Router FastAPI para el módulo de Cartera.

Endpoints expuestos bajo el prefijo /api/v1/cartera:

  GET  /resumen  → Resumen financiero agregado por corredor
  GET  /         → Listar registros de cartera (proyección sobre polizas)
  GET  /{id}     → Obtener detalle de un registro de cartera
  PATCH /{id}    → Actualizar estado, orden de pago y soporte documental

El módulo de Cartera NO tiene tabla propia: es una vista enriquecida de la
tabla polizas que permite al área financiera gestionar el reintegro de primas.

IMPORTANTE: /resumen debe declararse ANTES de /{cartera_id} para evitar que
FastAPI intente convertir el literal "resumen" a int.
"""
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db
from app.models.aseguradora import Aseguradora
from app.models.corredor import Corredor
from app.models.poliza import EstadoCartera, Poliza
from app.schemas.cartera import (
    CarteraListResponse,
    CarteraResumenItem,
    CarteraResumenResponse,
    CarteraResponse,
    CarteraUpdate,
)

router = APIRouter(prefix="/cartera", tags=["Cartera"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


# ═══════════════════════════════════════════════════════════════════════════════
# GET /cartera/resumen — Resumen financiero por corredor
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/resumen",
    response_model=CarteraResumenResponse,
    summary="Resumen financiero de cartera por corredor",
    description=(
        "Agrega las primas de todas las pólizas con estado_cartera activo "
        "(PENDIENTE_REINTEGRO, ABONADO, PAGADO) y las agrupa por corredor. "
        "Incluye gran total de toda la cartera."
    ),
)
async def resumen_cartera(db: DbSession) -> CarteraResumenResponse:
    # ── Columnas de suma condicional por estado ──────────────────────────────
    col_pendiente = func.coalesce(
        func.sum(
            case(
                (
                    Poliza.estado_cartera == EstadoCartera.PENDIENTE_REINTEGRO,
                    func.coalesce(Poliza.valor_prima, Decimal("0")),
                ),
                else_=Decimal("0"),
            )
        ),
        Decimal("0"),
    ).label("total_pendiente")

    col_abonado = func.coalesce(
        func.sum(
            case(
                (
                    Poliza.estado_cartera == EstadoCartera.ABONADO,
                    func.coalesce(Poliza.valor_prima, Decimal("0")),
                ),
                else_=Decimal("0"),
            )
        ),
        Decimal("0"),
    ).label("total_abonado")

    col_pagado = func.coalesce(
        func.sum(
            case(
                (
                    Poliza.estado_cartera == EstadoCartera.PAGADO,
                    func.coalesce(Poliza.valor_prima, Decimal("0")),
                ),
                else_=Decimal("0"),
            )
        ),
        Decimal("0"),
    ).label("total_pagado")

    stmt = (
        select(
            Corredor.id.label("corredor_id"),
            Corredor.nombre_corredor.label("corredor_nombre"),
            Corredor.empresa.label("corredor_empresa"),
            func.count(Poliza.id).label("total_polizas"),
            col_pendiente,
            col_abonado,
            col_pagado,
        )
        .select_from(Poliza)
        .outerjoin(Corredor, Poliza.corredor_id == Corredor.id)
        .where(
            Poliza.estado_cartera.isnot(None),
            Poliza.estado_cartera != EstadoCartera.NO_APLICA,
        )
        .group_by(
            Corredor.id,
            Corredor.nombre_corredor,
            Corredor.empresa,
        )
        .order_by(
            func.coalesce(
                func.sum(Poliza.valor_prima), Decimal("0")
            ).desc()
        )
    )

    result = await db.execute(stmt)
    rows = result.all()

    items: list[CarteraResumenItem] = [
        CarteraResumenItem(
            corredor_id=row.corredor_id,
            corredor_nombre=row.corredor_nombre or "Sin corredor",
            corredor_empresa=row.corredor_empresa or "—",
            total_polizas=row.total_polizas,
            total_pendiente=row.total_pendiente or Decimal("0"),
            total_abonado=row.total_abonado or Decimal("0"),
            total_pagado=row.total_pagado or Decimal("0"),
        )
        for row in rows
    ]

    return CarteraResumenResponse(
        items=items,
        gran_total_pendiente=sum((i.total_pendiente for i in items), Decimal("0")),
        gran_total_abonado=sum((i.total_abonado for i in items), Decimal("0")),
        gran_total_pagado=sum((i.total_pagado for i in items), Decimal("0")),
    )


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
        stmt = stmt.join(Aseguradora, Poliza.aseguradora_id == Aseguradora.id, isouter=True).where(
            or_(
                Poliza.numero_poliza.ilike(q),
                Poliza.centro_costo_solicitante.ilike(q),
                Poliza.centro_costo_pagador.ilike(q),
                Aseguradora.nombre.ilike(q),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total: int = (await db.execute(count_stmt)).scalar_one()

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
    current_user: CurrentUser,  # TODO: Integrar con servicio de Auth
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

    # Validar integridad financiera al marcar como PAGADO.
    # Se fusionan los valores del payload con los ya guardados en BD para
    # permitir PATCHes parciales (ej: solo enviar estado_cartera=PAGADO
    # cuando orden_pago_numero ya fue registrado en una operación anterior).
    if cambios.get("estado_cartera") == EstadoCartera.PAGADO:
        numero_efectivo = cambios.get("orden_pago_numero") or poliza.orden_pago_numero
        fecha_efectiva  = cambios.get("orden_pago_fecha")  or poliza.orden_pago_fecha
        faltantes = []
        if not numero_efectivo or not str(numero_efectivo).strip():
            faltantes.append("'orden_pago_numero'")
        if not fecha_efectiva:
            faltantes.append("'orden_pago_fecha'")
        if faltantes:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Para registrar estado PAGADO se requieren: {' y '.join(faltantes)}. "
                    "Son la evidencia documental del reintegro de la prima."
                ),
            )

    for campo, valor in cambios.items():
        setattr(poliza, campo, valor)

    poliza.modificado_por = current_user["email"]  # TODO: Integrar con servicio de Auth

    await db.commit()
    await db.refresh(poliza)

    return CarteraResponse.from_poliza(poliza)
