"""
app/api/v1/endpoints/entidades.py
Endpoints de listado para Aseguradoras y Corredores.
Registrado en main.py con prefix /api/v1.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.aseguradora import Aseguradora
from app.models.corredor import Corredor
from app.models.poliza import Poliza, EstadoPoliza
from app.schemas.aseguradora import AseguradoraCreate
from app.schemas.corredor import CorredorCreate, CorredorResponse

router = APIRouter()
logger = logging.getLogger("idexud.entidades")

# ── Schemas inline para Aseguradora (solo en este contexto) ──────────────────
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AseguradoraListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    nit: Optional[str] = None
    contacto_email: Optional[str] = None
    contacto_telefono: Optional[str] = None
    contacto_nombre: Optional[str] = None
    activa: bool = True
    polizas_vinculadas: int = 0
    created_at: datetime


# ════════════════════════════════════════════════════════════════════
# ASEGURADORAS
# ════════════════════════════════════════════════════════════════════

@router.get("/aseguradoras", response_model=list[AseguradoraListItem], tags=["Entidades"])
async def listar_aseguradoras(
    busqueda: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Aseguradora, func.count(Poliza.id).label("polizas_vinculadas"))
        .outerjoin(Poliza, Poliza.aseguradora_id == Aseguradora.id)
        .group_by(Aseguradora.id)
        .order_by(Aseguradora.nombre.asc())
    )
    if busqueda:
        stmt = stmt.where(
            Aseguradora.nombre.ilike(f"%{busqueda}%")
            | Aseguradora.nit.ilike(f"%{busqueda}%")
        )

    result = await db.execute(stmt)
    return [
        AseguradoraListItem(**aseg.__dict__, polizas_vinculadas=conteo)
        for aseg, conteo in result.all()
    ]


@router.post("/aseguradoras", response_model=AseguradoraListItem, status_code=201, tags=["Entidades"])
async def crear_aseguradora(
    payload: AseguradoraCreate,
    db: AsyncSession = Depends(get_db),
) -> AseguradoraListItem:
    # Unicidad de nombre
    dup_nombre = (await db.execute(select(Aseguradora).where(Aseguradora.nombre == payload.nombre))).scalar_one_or_none()
    if dup_nombre:
        raise HTTPException(409, detail=f"Ya existe una aseguradora con el nombre '{payload.nombre}'.")

    # Unicidad de NIT
    dup_nit = (await db.execute(select(Aseguradora).where(Aseguradora.nit == payload.nit))).scalar_one_or_none()
    if dup_nit:
        raise HTTPException(409, detail=f"Ya existe una aseguradora registrada con el NIT '{payload.nit}'.")

    aseg = Aseguradora(**payload.model_dump())
    db.add(aseg)
    await db.commit()
    await db.refresh(aseg)
    logger.info("Aseguradora creada: id=%s nombre='%s'", aseg.id, aseg.nombre)
    return AseguradoraListItem(**aseg.__dict__, polizas_vinculadas=0)


@router.delete("/aseguradoras/{id}", status_code=204, tags=["Entidades"])
async def eliminar_aseguradora(id: int, db: AsyncSession = Depends(get_db)):
    aseg = await db.get(Aseguradora, id)
    if not aseg:
        raise HTTPException(404, "Aseguradora no encontrada")
    await db.delete(aseg)
    await db.commit()
    return None


# ════════════════════════════════════════════════════════════════════
# CORREDORES  — usa la tabla `corredores` (modelo Corredor real)
# ════════════════════════════════════════════════════════════════════

@router.get("/corredores", response_model=list[CorredorResponse], tags=["Entidades"])
async def listar_corredores(
    busqueda: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    estados_activos = [EstadoPoliza.ACTIVA, EstadoPoliza.POR_VENCER]

    subq_total = (
        select(func.count(Poliza.id))
        .where(Poliza.corredor_id == Corredor.id)
        .correlate(Corredor)
        .scalar_subquery()
    )
    subq_activas = (
        select(func.count(Poliza.id))
        .where(
            Poliza.corredor_id == Corredor.id,
            Poliza.estado.in_(estados_activos),
        )
        .correlate(Corredor)
        .scalar_subquery()
    )

    stmt = (
        select(Corredor, subq_total, subq_activas)
        .where(Corredor.activo == True)  # noqa: E712
        .order_by(Corredor.nombre_corredor.asc())
    )
    if busqueda:
        stmt = stmt.where(
            Corredor.nombre_corredor.ilike(f"%{busqueda}%")
            | Corredor.empresa.ilike(f"%{busqueda}%")
        )

    result = await db.execute(stmt)
    return [
        CorredorResponse(
            **c.__dict__,
            polizas_total=total or 0,
            polizas_activas=activas or 0,
        )
        for c, total, activas in result.all()
    ]


@router.post("/corredores", response_model=CorredorResponse, status_code=201, tags=["Entidades"])
async def crear_corredor(
    payload: CorredorCreate,
    db: AsyncSession = Depends(get_db),
) -> CorredorResponse:
    corredor = Corredor(**payload.model_dump())
    db.add(corredor)
    await db.commit()
    await db.refresh(corredor)
    return CorredorResponse(
        **corredor.__dict__,
        polizas_total=0,
        polizas_activas=0,
    )
