import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import configurar_logging
from app.api.v1.router import api_router
from app.api.v1.endpoints.solicitudes import router as solicitudes_router
from app.api.v1.endpoints.reportes import router as reportes_router
from app.api.v1.endpoints.entidades import router as entidades_router # <--- NUEVO

configurar_logging()
logger = logging.getLogger("idexud.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Iniciando %s v%s", settings.PROJECT_NAME, settings.PROJECT_VERSION)
    from app.db.session import init_db
    await init_db()
    logger.info("   DB: Tablas verificadas.")
    yield
    logger.info("🛑 Cerrando aplicación...")
    from app.db.session import engine
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
    description="Sistema de Gestión de Pólizas y Cartera — Idexud",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
    errores = [{"campo": "→".join(str(l) for l in e["loc"][1:]), "mensaje": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "Errores de validación", "errores": errores})

# Registro de Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(solicitudes_router, prefix=settings.API_V1_PREFIX, tags=["Solicitudes"])
app.include_router(reportes_router, prefix=f"{settings.API_V1_PREFIX}/reportes", tags=["Reportes"])
app.include_router(entidades_router, prefix=settings.API_V1_PREFIX, tags=["Entidades"]) # <--- REGISTRADO

@app.get("/health", tags=["Sistema"])
async def health_check():
    return {"status": "ok", "version": settings.PROJECT_VERSION}