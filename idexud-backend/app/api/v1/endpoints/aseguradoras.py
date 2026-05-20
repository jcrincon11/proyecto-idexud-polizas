"""app/api/v1/endpoints/aseguradoras.py — List + Create (para selects del form)."""
from fastapi import APIRouter, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from fastapi import Depends

from app.api.deps import get_db
from app.models.aseguradora import Aseguradora
from app.schemas.aseguradora import AseguradoraCreate, AseguradoraResponse

router = APIRouter(prefix="/aseguradoras", tags=["Aseguradoras"])
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=list[AseguradoraResponse])
async def listar_aseguradoras(db: DbSession):
    result = await db.execute(
        select(Aseguradora).where(Aseguradora.activa == True).order_by(Aseguradora.nombre)
    )
    return result.scalars().all()


@router.post("/", response_model=AseguradoraResponse, status_code=status.HTTP_201_CREATED)
async def crear_aseguradora(payload: AseguradoraCreate, db: DbSession):
    aseguradora = Aseguradora(**payload.model_dump())
    db.add(aseguradora)
    await db.commit()
    await db.refresh(aseguradora)
    return aseguradora
