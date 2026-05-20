"""
app/schemas/solicitud.py
========================
Schemas para el flujo de BORRADOR (etapa PMO).
Son completamente independientes de PolizaCreate/PolizaResponse.

Integración:
  En app/schemas/__init__.py agrega:
    from .solicitud import SolicitudCreate, SolicitudResponse
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Enum local (o importa el de tus models si ya está ahí) ────────
# Si tu models.py usa SQLAlchemy Enum, usa str directamente aquí
# para no acoplar el schema a la DB.
TIPOS_GARANTIA_VALIDOS = {
    "POLIZA_CUMPLIMIENTO",
    "POLIZA_ANTICIPO",
    "POLIZA_CALIDAD",
    "GARANTIA_BANCARIA",
    "PAGARE",
}


# ═══════════════════════════════════════════════════════════════════
# REQUEST: lo que PMO envía desde SolicitudModal.jsx
# ═══════════════════════════════════════════════════════════════════

class SolicitudCreate(BaseModel):
    """
    Body de POST /api/v1/solicitudes
    Solo los 4 campos que PMO llena en el modal inicial.
    El backend asigna estado='BORRADOR' automáticamente.
    """

    descripcion:      str           = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Descripción del objeto de la garantía",
    )
    tipo_garantia:    str           = Field(
        ...,
        description="Tipo de garantía (POLIZA_CUMPLIMIENTO, PAGARE, etc.)",
    )
    enlace_nextcloud: str           = Field(
        ...,
        min_length=5,
        max_length=500,
        description="URL o ruta de la carpeta en NextCloud",
    )
    monto_asegurado:  Optional[Decimal] = Field(
        None,
        ge=0,
        description="Monto en COP (opcional al inicio)",
    )

    @field_validator("tipo_garantia")
    @classmethod
    def validar_tipo(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in TIPOS_GARANTIA_VALIDOS:
            raise ValueError(
                f"tipo_garantia inválido: '{v}'. "
                f"Valores aceptados: {sorted(TIPOS_GARANTIA_VALIDOS)}"
            )
        return v

    @field_validator("enlace_nextcloud")
    @classmethod
    def limpiar_enlace(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El enlace NextCloud no puede estar vacío.")
        return v

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(cls, v: str) -> str:
        return v.strip()

    model_config = ConfigDict(str_strip_whitespace=True)


# ═══════════════════════════════════════════════════════════════════
# RESPONSE: lo que el endpoint devuelve al frontend tras crear
# ═══════════════════════════════════════════════════════════════════

class SolicitudResponse(BaseModel):
    """
    Respuesta de POST /api/v1/solicitudes
    El frontend usa `id` y `numero_radicado` para mostrar el ticket animado.
    """

    id:               int
    numero_radicado:  str           # Ej: "SOL-2024-00042"
    descripcion:      str
    tipo_garantia:    str
    enlace_nextcloud: str
    monto_asegurado:  Optional[Decimal] = None
    estado:           str           # Siempre "BORRADOR" al crear
    created_at:       datetime

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════
# HELPER: genera el número de radicado legible
# ═══════════════════════════════════════════════════════════════════

def generar_numero_radicado(poliza_id: int) -> str:
    """
    SOL-2024-00042
    Importa y usa esto en el endpoint después de hacer db.flush()
    para tener el id asignado por la DB.
    """
    from datetime import date
    año = date.today().year
    return f"SOL-{año}-{poliza_id:05d}"
