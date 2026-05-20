import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.aseguradora import Aseguradora
from app.models.contratista import Contratista # Usamos Contratista como Corredor
from app.models.poliza import Poliza, EstadoPoliza

router = APIRouter()
logger = logging.getLogger("idexud.entidades")

# ════════════════════════════════════════════════════════════════════
# SCHEMAS DE RESPUESTA
# ════════════════════════════════════════════════════════════════════

class AseguradoraResponse(BaseModel):
    id: int
    nombre: str
    nit: Optional[str] = None
    dominio: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    contacto: Optional[str] = None
    polizas_vinculadas: int = 0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CorredorResponse(BaseModel):
    id: int
    nombre_razon_social: str # Mapeado de Contratista
    numero_identificacion: Optional[str] = None # NIT
    dominio: Optional[str] = "idexud.udistrital.edu.co"
    email: Optional[str] = None
    polizas_gestionadas: int = 0
    polizas_activas: int = 0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ════════════════════════════════════════════════════════════════════
# ENDPOINTS ASEGURADORAS
# ════════════════════════════════════════════════════════════════════

@router.get("/aseguradoras", response_model=list[AseguradoraResponse])
async def listar_aseguradoras(
    busqueda: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Aseguradora, func.count(Poliza.id).label("polizas_vinculadas"))
        .outerjoin(Poliza, Poliza.aseguradora_id == Aseguradora.id)
        .group_by(Aseguradora.id)
        .order_by(Aseguradora.nombre.asc())
    )
    if busqueda:
        stmt = stmt.where(Aseguradora.nombre.ilike(f"%{busqueda}%") | Aseguradora.nit.ilike(f"%{busqueda}%"))
    
    result = await db.execute(stmt)
    return [
        AseguradoraResponse(
            **aseg.__dict__,
            polizas_vinculadas=conteo
        ) for aseg, conteo in result.all()
    ]

# ════════════════════════════════════════════════════════════════════
# ENDPOINTS CORREDORES (CONTRATISTAS)
# ════════════════════════════════════════════════════════════════════

@router.get("/corredores", response_model=list[CorredorResponse])
async def listar_corredores(db: AsyncSession = Depends(get_db)):
    # Estados que consideramos como "Activos" para el contador de la tarjeta
    estados_activos = [EstadoPoliza.ACTIVA, EstadoPoliza.POR_VENCER, EstadoPoliza.EMITIDA]

    # Subquery para total de pólizas
    subq_total = (
        select(func.count(Poliza.id))
        .where(Poliza.contratista_id == Contratista.id)
        .correlate(Contratista)
        .scalar_subquery()
    )
    
    # Subquery para pólizas activas
    subq_activas = (
        select(func.count(Poliza.id))
        .where(
            Poliza.contratista_id == Contratista.id,
            Poliza.estado.in_(estados_activos)
        )
        .correlate(Contratista)
        .scalar_subquery()
    )

    stmt = select(Contratista, subq_total, subq_activas).order_by(Contratista.nombre_razon_social.asc())
    result = await db.execute(stmt)
    
    return [
        CorredorResponse(
            **c.__dict__,
            polizas_gestionadas=total or 0,
            polizas_activas=activas or 0
        ) for c, total, activas in result.all()
    ]

@router.delete("/aseguradoras/{id}", status_code=204)
async def eliminar_aseguradora(id: int, db: AsyncSession = Depends(get_db)):
    # Borrado lógico si el modelo tiene el campo 'activo', sino físico para la demo
    aseg = await db.get(Aseguradora, id)
    if not aseg: raise HTTPException(404, "Aseguradora no encontrada")
    await db.delete(aseg)
    await db.commit()
    return None