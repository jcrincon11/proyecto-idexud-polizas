"""
app/api/v1/endpoints/aseguradoras.py
======================================
Solo expone POST /aseguradoras/ para crear nuevas aseguradoras.

El listado enriquecido (con conteo de pólizas y búsqueda) vive en
entidades.py → GET /aseguradoras, que es el que consume la página
de gestión y los selects de los formularios.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.aseguradora import Aseguradora
from app.schemas.aseguradora import AseguradoraCreate, AseguradoraResponse

router = APIRouter(prefix="/aseguradoras", tags=["Aseguradoras"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("/", response_model=AseguradoraResponse, status_code=status.HTTP_201_CREATED)
async def crear_aseguradora(payload: AseguradoraCreate, db: DbSession):
    aseguradora = Aseguradora(**payload.model_dump())
    db.add(aseguradora)
    await db.commit()
    await db.refresh(aseguradora)
    return aseguradora
