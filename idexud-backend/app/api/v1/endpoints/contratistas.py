"""app/api/v1/endpoints/contratistas.py — List + Create (para selects del form)."""
from fastapi import APIRouter, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from fastapi import Depends

from app.api.deps import get_db
from app.models.contratista import Contratista
from app.schemas.contratista import ContratistaCreate, ContratistaResponse

router = APIRouter(prefix="/contratistas", tags=["Contratistas"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=list[ContratistaResponse])
async def listar_contratistas(db: DbSession):
    result = await db.execute(
        select(Contratista).where(Contratista.activo == True).order_by(Contratista.nombre_razon_social)
    )
    return result.scalars().all()


@router.post("/", response_model=ContratistaResponse, status_code=status.HTTP_201_CREATED)
async def crear_contratista(payload: ContratistaCreate, db: DbSession):
    contratista = Contratista(**payload.model_dump())
    db.add(contratista)
    await db.commit()
    await db.refresh(contratista)
    return contratista
