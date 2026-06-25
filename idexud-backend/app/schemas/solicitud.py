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

import secrets
import string
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
    valor_contrato:   Optional[Decimal] = Field(
        None,
        ge=0,
        description="Valor total del contrato en COP (opcional al crear la solicitud)",
    )
    centro_costos:    Optional[str] = Field(
        None,
        max_length=100,
        description="ID del centro de costos / proyecto (ej: CC-001)",
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
    Respuesta de POST /api/v1/solicitudes y GET /api/v1/solicitudes/{id}.
    El frontend usa `codigo_comprobante` como identificador único de comprobante.
    """

    id:                  int
    numero_radicado:     str            # Ej: "SOL-2026-00042"
    codigo_comprobante:  str            # Ej: "REQ-PMO-A3F9B2"
    descripcion:         str
    tipo_garantia:       str
    enlace_nextcloud:    str
    valor_contrato:      Optional[Decimal] = None
    centro_costos:       Optional[str] = None
    estado:              str
    creado_por:          Optional[str] = None
    created_at:          datetime

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════

def generar_numero_radicado(poliza_id: int) -> str:
    """SOL-2026-00042  — llamar después de db.flush() para tener el ID."""
    from datetime import date
    año = date.today().year
    return f"SOL-{año}-{poliza_id:05d}"


def generar_codigo_comprobante() -> str:
    """
    Genera un código alfanumérico único para el comprobante PMO.
    Formato: REQ-PMO-XXXXXX  (6 chars A-Z + 0-9, p.ej. REQ-PMO-A3F9B2)
    Llamar ANTES de guardar en BD para incluirlo en notas_internas.
    """
    chars = string.ascii_uppercase + string.digits
    sufijo = "".join(secrets.choice(chars) for _ in range(6))
    return f"REQ-PMO-{sufijo}"


def extraer_notas_pmo(notas: str | None) -> tuple[str, str, str]:
    """
    Parsea notas_internas y retorna (enlace_nextcloud, codigo_comprobante, centro_costos).
    Formato guardado:
        [PMO] Enlace NextCloud: <url>
        [COMPROBANTE] REQ-PMO-XXXXXX
        [CENTRO_COSTOS] CC-001
    """
    enlace = ""
    codigo = ""
    centro = ""
    for linea in (notas or "").split("\n"):
        linea = linea.strip()
        if linea.startswith("[PMO] Enlace NextCloud:"):
            enlace = linea[len("[PMO] Enlace NextCloud:"):].strip()
        elif linea.startswith("[COMPROBANTE]"):
            codigo = linea[len("[COMPROBANTE]"):].strip()
        elif linea.startswith("[CENTRO_COSTOS]"):
            centro = linea[len("[CENTRO_COSTOS]"):].strip()
    return enlace, codigo, centro
