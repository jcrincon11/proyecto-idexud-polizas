"""
app/models/__init__.py

Importa todos los modelos para que SQLAlchemy / Alembic los registre
en el metadata de Base. Este archivo es el único punto de entrada
necesario para que `alembic revision --autogenerate` detecte todos los cambios.
"""

from app.models.aseguradora import Aseguradora          # noqa: F401
from app.models.contratista import Contratista, TipoContratista  # noqa: F401
from app.models.corredor import Corredor                 # noqa: F401
from app.models.poliza import (                          # noqa: F401
    Poliza,
    TipoPoliza,
    EstadoPoliza,
    EstadoCartera,
    ModalidadGarantia,
)
from app.models.siniestro import Siniestro, EstadoSiniestro  # noqa: F401
from app.models.checklist import ChecklistExpedicion     # noqa: F401
from app.models.alerta import AlertaVencimiento, CanalAlerta, EstadoAlerta  # noqa: F401
from app.models.usuario import Usuario, RolUsuario       # noqa: F401
from app.models.proyecto_siexud import ProyectoSiexud   # noqa: F401

__all__ = [
    "Aseguradora",
    "Contratista",
    "TipoContratista",
    "Corredor",
    "Poliza",
    "TipoPoliza",
    "EstadoPoliza",
    "EstadoCartera",
    "ModalidadGarantia",
    "Siniestro",
    "EstadoSiniestro",
    "ChecklistExpedicion",
    "AlertaVencimiento",
    "CanalAlerta",
    "EstadoAlerta",
    "Usuario",
    "RolUsuario",
    "ProyectoSiexud",
]
