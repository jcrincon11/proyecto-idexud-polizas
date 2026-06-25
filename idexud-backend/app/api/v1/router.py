"""app/api/v1/router.py — Router central de la API v1."""
from fastapi import APIRouter
from app.core.config import settings
from app.api.v1.endpoints import polizas, aseguradoras, contratistas, checklist, cartera
from app.api.v1.endpoints import sincronizacion

api_router = APIRouter()
api_router.include_router(polizas.router)
api_router.include_router(aseguradoras.router)
api_router.include_router(contratistas.router)
api_router.include_router(checklist.router)
api_router.include_router(cartera.router)
api_router.include_router(sincronizacion.router)

if settings.is_development:
    from app.api.v1.endpoints import seed
    api_router.include_router(seed.router)
