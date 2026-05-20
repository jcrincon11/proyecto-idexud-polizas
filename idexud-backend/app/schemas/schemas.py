"""
schemas.py — Schemas Progresivos con Pydantic v2
=================================================
Patrón de tres schemas por entidad:

  PeticionCreate  → mínimo obligatorio (lo que no puede faltar nunca)
  PeticionUpdate  → todo Optional  (semántica PATCH, excluye None por defecto)
  PeticionRead    → modelo completo + computed fields para la UI

La clave para que Pydantic no falle con campos null:
  1. PeticionCreate  declara solo los campos realmente obligatorios.
  2. PeticionUpdate  declara todo como Optional y usa model_validator
     para descartar las claves que vengan como None (PATCH puro).
  3. PeticionRead    usa from_attributes=True y todos los campos
     opcionales con Optional[T] = None.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import (
    BaseModel, ConfigDict, Field,
    computed_field, field_validator, model_validator,
)

from models import (
    EstadoPoliza, TipoGarantia, RolUsuario,
    PERMISOS_POR_ESTADO, get_campos_editables,
)


# ═══════════════════════════════════════════════════════════════════
# PeticionCreate — solo campos obligatorios al inicio del flujo
# ═══════════════════════════════════════════════════════════════════

class PeticionCreate(BaseModel):
    """
    Body de POST /polizas

    Pydantic rechaza el request si falta cualquiera de estos campos.
    Los demás campos opcionales del modelo se llenan en estados posteriores.
    """
    descripcion:      str          = Field(..., min_length=10, max_length=2000)
    tipo_garantia:    TipoGarantia = Field(...)
    enlace_nextcloud: str          = Field(..., min_length=5, max_length=500)

    # Recomendado desde el inicio pero no bloqueante
    monto_asegurado:  Optional[Decimal] = Field(None, ge=0)

    @field_validator("enlace_nextcloud")
    @classmethod
    def limpiar_enlace(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El enlace de NextCloud no puede estar vacío")
        return v

    model_config = ConfigDict(str_strip_whitespace=True)


# ═══════════════════════════════════════════════════════════════════
# PeticionUpdate — semántica PATCH pura
# ═══════════════════════════════════════════════════════════════════

class PeticionUpdate(BaseModel):
    """
    Body de PATCH /polizas/{id}

    TODOS los campos son Optional. Pydantic solo valida los que
    el cliente incluya en el JSON. Los omitidos no se tocan en la DB.

    El service layer verifica permisos por rol y estado antes de escribir.

    ¿Por qué no falla con campos null?
    → model_validator(mode='before') elimina claves con valor None del dict
      antes de que Pydantic construya el modelo. Así "omitido" y "null explícito"
      son tratados igual: ninguno dispara validaciones de tipo.
    """

    # ── BORRADOR ─────────────────────────────────────────────────
    descripcion:      Optional[str]           = Field(None, min_length=10, max_length=2000)
    tipo_garantia:    Optional[TipoGarantia]  = None
    enlace_nextcloud: Optional[str]           = Field(None, min_length=5, max_length=500)
    monto_asegurado:  Optional[Decimal]       = Field(None, ge=0)

    # ── SOLICITUD_PMO ─────────────────────────────────────────────
    observaciones_pmo: Optional[str] = None

    # ── JURIDICA_ANALISIS ─────────────────────────────────────────
    centro_de_costos:       Optional[str]      = Field(None, max_length=100)
    aseguradora:            Optional[str]      = Field(None, max_length=200)
    numero_poliza_borrador: Optional[str]      = Field(None, max_length=100)
    fecha_inicio_vigencia:  Optional[datetime] = None
    fecha_fin_vigencia:     Optional[datetime] = None
    condiciones_especiales: Optional[str]      = None

    # ── EMITIDA ───────────────────────────────────────────────────
    numero_poliza:           Optional[str]      = Field(None, max_length=100)
    fecha_emision:           Optional[datetime] = None
    enlace_documento_poliza: Optional[str]      = Field(None, max_length=500)

    # ── EMITIDA / valor_prima ─────────────────────────────────────
    valor_prima:           Optional[Decimal]  = Field(None, ge=0)
    fecha_pago_programado: Optional[datetime] = None

    # ── PAGADA ────────────────────────────────────────────────────
    valor_prima_pagada: Optional[Decimal]  = Field(None, ge=0)
    fecha_pago_real:    Optional[datetime] = None
    comprobante_pago:   Optional[str]      = Field(None, max_length=500)

    # ── REINTEGRADA (bloqueado hasta PAGADA en el service) ────────
    valor_reintegro:         Optional[Decimal] = Field(None, ge=0)
    observaciones_reintegro: Optional[str]     = None

    # ── Validador clave: convierte el body en un PATCH real ───────
    @model_validator(mode="before")
    @classmethod
    def descartar_nones_del_body(cls, data: Any) -> Any:
        """
        Elimina claves cuyo valor es None ANTES de que Pydantic
        construya el modelo.

        Efecto:    {"campo": None}  →  {}  (no se toca en DB)
        Contraste: {"campo": 0}     →  {"campo": 0}  (sí se actualiza)

        Si el cliente quiere vaciar un campo intencionalmente,
        debe usar un endpoint DELETE específico o un sentinel explícito.
        """
        if isinstance(data, dict):
            return {k: v for k, v in data.items() if v is not None}
        return data

    @field_validator("fecha_fin_vigencia", mode="after")
    @classmethod
    def validar_rango_vigencia(cls, v: Optional[datetime], info) -> Optional[datetime]:
        inicio = info.data.get("fecha_inicio_vigencia")
        if v and inicio and v <= inicio:
            raise ValueError("fecha_fin_vigencia debe ser posterior a fecha_inicio_vigencia")
        return v

    model_config = ConfigDict(str_strip_whitespace=True)

    def campos_enviados(self) -> dict[str, Any]:
        """
        Retorna solo los campos que el cliente incluyó en el request.
        Úsalo en el service layer:
            campos = update_data.campos_enviados()
        """
        return self.model_dump(exclude_unset=True, exclude_none=True)


# ═══════════════════════════════════════════════════════════════════
# PeticionRead — respuesta completa con campos computados para la UI
# ═══════════════════════════════════════════════════════════════════

class PeticionRead(BaseModel):
    """
    Respuesta de GET /polizas/{id}

    Incluye computed_fields que la UI consume para decidir qué mostrar:
      - campos_bloqueados_ui: campos que no deben renderizarse aún
      - checklist_visible: items del checklist activos en este estado
    """
    id:         int
    created_at: datetime
    updated_at: Optional[datetime] = None
    estado:     EstadoPoliza

    # Campos progresivos — todos Optional para no fallar en lectura
    descripcion:      str
    tipo_garantia:    TipoGarantia
    enlace_nextcloud: Optional[str]    = None
    monto_asegurado:  Optional[Decimal] = None
    solicitante_id:   int

    observaciones_pmo: Optional[str] = None
    centro_de_costos:  Optional[str] = None

    aseguradora:             Optional[str]      = None
    numero_poliza_borrador:  Optional[str]      = None
    fecha_inicio_vigencia:   Optional[datetime] = None
    fecha_fin_vigencia:      Optional[datetime] = None
    condiciones_especiales:  Optional[str]      = None

    numero_poliza:           Optional[str]      = None
    fecha_emision:           Optional[datetime] = None
    enlace_documento_poliza: Optional[str]      = None

    valor_prima:           Optional[Decimal]  = None
    fecha_pago_programado: Optional[datetime] = None

    valor_prima_pagada:  Optional[Decimal]  = None
    fecha_pago_real:     Optional[datetime] = None
    comprobante_pago:    Optional[str]      = None

    valor_reintegro:         Optional[Decimal] = None
    observaciones_reintegro: Optional[str]     = None

    # ── Campos computados (no viven en la DB) ─────────────────────

    @computed_field
    @property
    def es_poliza_activa(self) -> bool:
        """True cuando ya cruzó el umbral de póliza (para cambiar título en UI)."""
        return self.estado in {
            EstadoPoliza.JURIDICA_ANALISIS, EstadoPoliza.EMITIDA,
            EstadoPoliza.PAGADA, EstadoPoliza.REINTEGRADA,
            EstadoPoliza.NO_REQUIERE_REINTEGRO,
        }

    @computed_field
    @property
    def campos_bloqueados_ui(self) -> list[str]:
        """
        Campos que la UI debe ocultar o deshabilitar completamente
        en el estado actual (sin importar el rol).

        La UI usa esta lista para condicionar la visibilidad de secciones enteras.
        """
        bloqueados: list[str] = []

        estados_sin_costos = {EstadoPoliza.BORRADOR, EstadoPoliza.SOLICITUD_PMO}
        if self.estado in estados_sin_costos:
            bloqueados.append("centro_de_costos")

        estados_sin_reintegro = {
            EstadoPoliza.BORRADOR, EstadoPoliza.SOLICITUD_PMO,
            EstadoPoliza.JURIDICA_ANALISIS, EstadoPoliza.EMITIDA,
        }
        if self.estado in estados_sin_reintegro:
            bloqueados.extend(["valor_reintegro", "observaciones_reintegro"])

        return bloqueados

    @computed_field
    @property
    def label_estado(self) -> str:
        """Texto legible del estado para mostrar en la UI."""
        labels = {
            EstadoPoliza.BORRADOR:              "Borrador",
            EstadoPoliza.SOLICITUD_PMO:         "En revisión PMO",
            EstadoPoliza.JURIDICA_ANALISIS:     "Análisis jurídico",
            EstadoPoliza.EMITIDA:               "Póliza emitida",
            EstadoPoliza.PAGADA:                "Prima pagada",
            EstadoPoliza.REINTEGRADA:           "Reintegrada",
            EstadoPoliza.NO_REQUIERE_REINTEGRO: "Sin reintegro",
        }
        return labels.get(self.estado, self.estado.value)

    model_config = ConfigDict(from_attributes=True)


class PeticionReadConPermisos(PeticionRead):
    """
    Extiende PeticionRead con los campos editables del usuario autenticado.
    Úsala cuando el endpoint conoce el rol del usuario.

    Uso:
        return PeticionReadConPermisos.para_rol(poliza_orm, current_user.rol)
    """
    campos_editables_usuario: list[str] = []

    @classmethod
    def para_rol(cls, obj, rol: str) -> "PeticionReadConPermisos":
        instance = cls.model_validate(obj)
        instance.campos_editables_usuario = get_campos_editables(obj.estado, rol)
        return instance


# ═══════════════════════════════════════════════════════════════════
# TransicionRequest — body del endpoint de cambio de estado
# ═══════════════════════════════════════════════════════════════════

class TransicionRequest(BaseModel):
    """
    Body de POST /polizas/{id}/transicionar
    """
    nuevo_estado: EstadoPoliza
    comentario:   Optional[str] = Field(None, max_length=1000)

    @field_validator("nuevo_estado", mode="before")
    @classmethod
    def normalizar(cls, v: str) -> str:
        return v.upper().strip() if isinstance(v, str) else v


class TransicionResponse(BaseModel):
    poliza_id:               int
    estado_anterior:         EstadoPoliza
    estado_nuevo:            EstadoPoliza
    campos_ahora_editables:  list[str]
    campos_ahora_bloqueados: list[str]
    mensaje:                 str
