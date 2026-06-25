import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.logging import configurar_logging
from app.api.v1.router import api_router
from app.api.v1.endpoints.solicitudes import router as solicitudes_router
from app.api.v1.endpoints.reportes import router as reportes_router
from app.api.v1.endpoints.entidades import router as entidades_router


class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    Capa de seguridad global: valida X-API-Key en todos los endpoints de escritura.
    Complementa el Depends(get_current_user) que ya opera por endpoint:
    esta capa protege cualquier ruta de mutación que pudiese olvidarse del Depends.
    """
    _SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
    _EXEMPT_PATHS = frozenset({"/health", "/docs", "/openapi.json", "/redoc"})

    async def dispatch(self, request, call_next):
        method = request.method
        path   = request.url.path
        print(f"[APIKey] >>> {method} {path}", flush=True)

        if method not in self._SAFE_METHODS and path not in self._EXEMPT_PATHS:
            api_key = request.headers.get("X-API-Key")
            key_ok  = bool(api_key) and api_key == settings.API_KEY
            print(f"[APIKey]     header presente={bool(api_key)}  válida={key_ok}", flush=True)
            if not key_ok:
                print(f"[APIKey] BLOQUEADO 401 — key recibida: {repr(api_key)}", flush=True)
                return JSONResponse(
                    status_code=401,
                    content={
                        "detail": (
                            "Acceso no autorizado. "
                            "Se requiere el encabezado 'X-API-Key' con una clave válida."
                        )
                    },
                    headers={"WWW-Authenticate": "ApiKey"},
                )

        response = await call_next(request)
        print(f"[APIKey] <<< {method} {path}  status={response.status_code}", flush=True)
        return response

# Forzar UTF-8 en stdout/stderr para evitar UnicodeEncodeError con caracteres no-ASCII en Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

configurar_logging()
logger = logging.getLogger("idexud.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando %s v%s", settings.PROJECT_NAME, settings.PROJECT_VERSION)
    from app.db.session import init_db
    await init_db()
    logger.info("DB: Tablas verificadas.")
    yield
    logger.info("Cerrando aplicacion...")
    from app.db.session import engine
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
    description="Sistema de Gestión de Pólizas y Cartera — Idexud",
)

# ORDEN IMPORTANTE: el último add_middleware es la capa más externa (LIFO en Starlette).
# CORSMiddleware DEBE ser la más externa para que sus cabeceras CORS se adjunten
# incluso cuando APIKeyMiddleware rechaza la petición con 401 antes del router.
# Si APIKeyMiddleware fuera la externa, el 401 llegaría al navegador sin cabeceras
# CORS y Axios vería error.response = null ("código desconocido").
app.add_middleware(APIKeyMiddleware)           # inner — se ejecuta antes que CORS en la request
app.add_middleware(                            # outer — siempre añade cabeceras CORS
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-API-Key"],
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