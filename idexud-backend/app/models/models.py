"""
models.py — Refactor para Flujo Progresivo
===========================================
INSTRUCCIONES ALEMBIC:
  Después de guardar este archivo, ejecuta:
    alembic revision --autogenerate -m "add_progressive_workflow_fields"
    alembic upgrade head

  Seguridad de migración:
  - Campos nuevos → nullable=True  (no rompen filas existentes)
  - Campo `estado` → server_default="BORRADOR" (retrocompatible)
  - El Enum `estadopoliza` es nuevo → Alembic lo crea en Postgres con CREATE TYPE
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SAEnum,
    ForeignKey, Integer, Numeric, String, Text, JSON,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────────

class EstadoPoliza(str, enum.Enum):
    BORRADOR                = "BORRADOR"
    SOLICITUD_PMO           = "SOLICITUD_PMO"
    JURIDICA_ANALISIS       = "JURIDICA_ANALISIS"
    EMITIDA                 = "EMITIDA"
    PAGADA                  = "PAGADA"
    REINTEGRADA             = "REINTEGRADA"
    NO_REQUIERE_REINTEGRO   = "NO_REQUIERE_REINTEGRO"


class TipoGarantia(str, enum.Enum):
    POLIZA_CUMPLIMIENTO = "POLIZA_CUMPLIMIENTO"
    POLIZA_ANTICIPO     = "POLIZA_ANTICIPO"
    POLIZA_CALIDAD      = "POLIZA_CALIDAD"
    GARANTIA_BANCARIA   = "GARANTIA_BANCARIA"
    PAGARE              = "PAGARE"


class RolUsuario(str, enum.Enum):
    SOLICITANTE = "SOLICITANTE"
    PMO         = "PMO"
    JURIDICA    = "JURIDICA"
    FINANCIERA  = "FINANCIERA"
    ADMIN       = "ADMIN"


# ─────────────────────────────────────────────────────────────────
# MAPA DE PERMISOS  { estado → { rol → [campos_editables] } }
# "Fuente de verdad única": service layer y schemas lo consumen.
# ─────────────────────────────────────────────────────────────────

PERMISOS_POR_ESTADO: dict[str, dict[str, list[str]]] = {
    EstadoPoliza.BORRADOR: {
        RolUsuario.SOLICITANTE: ["descripcion", "tipo_garantia", "enlace_nextcloud", "monto_asegurado"],
        RolUsuario.PMO:         ["descripcion", "tipo_garantia", "enlace_nextcloud", "monto_asegurado"],
        RolUsuario.ADMIN:       ["*"],
    },
    EstadoPoliza.SOLICITUD_PMO: {
        RolUsuario.SOLICITANTE: [],        # Solo lectura
        RolUsuario.PMO:         ["observaciones_pmo"],
        RolUsuario.ADMIN:       ["*"],
    },
    EstadoPoliza.JURIDICA_ANALISIS: {
        # centro_de_costos se vuelve obligatorio aquí (validado en service)
        RolUsuario.PMO:      ["centro_de_costos"],
        RolUsuario.JURIDICA: [
            "centro_de_costos", "aseguradora", "numero_poliza_borrador",
            "fecha_inicio_vigencia", "fecha_fin_vigencia", "condiciones_especiales",
        ],
        RolUsuario.ADMIN:    ["*"],
    },
    EstadoPoliza.EMITIDA: {
        RolUsuario.JURIDICA:   ["numero_poliza", "fecha_emision", "enlace_documento_poliza"],
        RolUsuario.FINANCIERA: ["valor_prima", "fecha_pago_programado"],
        RolUsuario.ADMIN:      ["*"],
    },
    EstadoPoliza.PAGADA: {
        # valor_reintegro solo visible/editable desde aquí
        RolUsuario.FINANCIERA: [
            "valor_prima_pagada", "fecha_pago_real",
            "comprobante_pago", "valor_reintegro",
        ],
        RolUsuario.ADMIN:      ["*"],
    },
    EstadoPoliza.REINTEGRADA: {
        RolUsuario.FINANCIERA: ["observaciones_reintegro"],
        RolUsuario.ADMIN:      ["*"],
    },
    EstadoPoliza.NO_REQUIERE_REINTEGRO: {
        RolUsuario.FINANCIERA: ["observaciones_reintegro"],
        RolUsuario.ADMIN:      ["*"],
    },
}

TRANSICIONES_VALIDAS: dict[str, list[str]] = {
    EstadoPoliza.BORRADOR:          [EstadoPoliza.SOLICITUD_PMO],
    EstadoPoliza.SOLICITUD_PMO:     [EstadoPoliza.JURIDICA_ANALISIS, EstadoPoliza.BORRADOR],
    EstadoPoliza.JURIDICA_ANALISIS: [EstadoPoliza.EMITIDA],
    EstadoPoliza.EMITIDA:           [EstadoPoliza.PAGADA],
    EstadoPoliza.PAGADA:            [EstadoPoliza.REINTEGRADA, EstadoPoliza.NO_REQUIERE_REINTEGRO],
}


def get_campos_editables(estado: str, rol: str) -> list[str]:
    return PERMISOS_POR_ESTADO.get(estado, {}).get(rol, [])


# ─────────────────────────────────────────────────────────────────
# MODELO PRINCIPAL — Poliza
# ─────────────────────────────────────────────────────────────────

class Poliza(Base):
    __tablename__ = "polizas"

    id         = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # ── NUEVO: estado ─────────────────────────────────────────────
    # server_default protege filas existentes en la migración
    estado = Column(
        SAEnum(EstadoPoliza, name="estadopoliza", create_type=True),
        nullable=False,
        server_default=EstadoPoliza.BORRADOR,
        default=EstadoPoliza.BORRADOR,
    )

    # ── Campos del inicio del flujo ───────────────────────────────
    descripcion     = Column(Text, nullable=False)
    tipo_garantia   = Column(SAEnum(TipoGarantia, name="tipogarantia", create_type=True), nullable=False)
    monto_asegurado = Column(Numeric(18, 2), nullable=True)
    solicitante_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    # ── NUEVO: enlace_nextcloud ───────────────────────────────────
    enlace_nextcloud  = Column(String(500), nullable=True)

    # ── SOLICITUD_PMO ─────────────────────────────────────────────
    observaciones_pmo = Column(Text, nullable=True)

    # ── NUEVO: centro_de_costos ───────────────────────────────────
    # Nullable en DB; obligatorio en lógica cuando estado = JURIDICA_ANALISIS
    centro_de_costos = Column(String(100), nullable=True)

    # ── JURIDICA_ANALISIS ─────────────────────────────────────────
    aseguradora             = Column(String(200), nullable=True)
    numero_poliza_borrador  = Column(String(100), nullable=True)
    fecha_inicio_vigencia   = Column(DateTime(timezone=True), nullable=True)
    fecha_fin_vigencia      = Column(DateTime(timezone=True), nullable=True)
    condiciones_especiales  = Column(Text, nullable=True)

    # ── EMITIDA ───────────────────────────────────────────────────
    numero_poliza           = Column(String(100), nullable=True, index=True)
    fecha_emision           = Column(DateTime(timezone=True), nullable=True)
    enlace_documento_poliza = Column(String(500), nullable=True)

    # ── NUEVO: valor_prima ────────────────────────────────────────
    valor_prima           = Column(Numeric(18, 2), nullable=True)
    fecha_pago_programado = Column(DateTime(timezone=True), nullable=True)

    # ── PAGADA ────────────────────────────────────────────────────
    valor_prima_pagada  = Column(Numeric(18, 2), nullable=True)
    fecha_pago_real     = Column(DateTime(timezone=True), nullable=True)
    comprobante_pago    = Column(String(500), nullable=True)

    # ── REINTEGRADA ───────────────────────────────────────────────
    # Invisible en la UI hasta estado PAGADA
    valor_reintegro         = Column(Numeric(18, 2), nullable=True)
    observaciones_reintegro = Column(Text, nullable=True)

    # ── Relaciones ────────────────────────────────────────────────
    solicitante     = relationship("Usuario", back_populates="polizas")
    checklist_items = relationship("ChecklistItem", back_populates="poliza", cascade="all, delete-orphan")
    historial       = relationship("HistorialEstado", back_populates="poliza", order_by="HistorialEstado.created_at")

    # ── Métodos de dominio ────────────────────────────────────────

    def transicionar(
        self,
        nuevo_estado: "EstadoPoliza",
        usuario_id: int,
        comentario: str | None = None,
    ) -> "HistorialEstado":
        """
        Valida y ejecuta una transición de estado.
        Raises ValueError si la transición no está en TRANSICIONES_VALIDAS.
        """
        permitidos = TRANSICIONES_VALIDAS.get(self.estado, [])
        if nuevo_estado not in permitidos:
            raise ValueError(
                f"Transición no permitida: {self.estado.value} → {nuevo_estado.value}. "
                f"Desde aquí puedes ir a: {[e.value for e in permitidos]}"
            )
        estado_anterior = self.estado
        self.estado = nuevo_estado
        return HistorialEstado(
            poliza_id=self.id,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            usuario_id=usuario_id,
            comentario=comentario,
        )

    def campos_editables_para(self, rol: str) -> list[str]:
        return get_campos_editables(self.estado, rol)


# ─────────────────────────────────────────────────────────────────
# HISTORIAL DE ESTADOS
# ─────────────────────────────────────────────────────────────────

class HistorialEstado(Base):
    __tablename__ = "historial_estados"

    id              = Column(Integer, primary_key=True, index=True)
    poliza_id       = Column(Integer, ForeignKey("polizas.id"), nullable=False)
    estado_anterior = Column(SAEnum(EstadoPoliza, name="estadopoliza"), nullable=True)
    estado_nuevo    = Column(SAEnum(EstadoPoliza, name="estadopoliza"), nullable=False)
    usuario_id      = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    comentario      = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    poliza  = relationship("Poliza", back_populates="historial")
    usuario = relationship("Usuario")


# ─────────────────────────────────────────────────────────────────
# CHECKLIST
# ─────────────────────────────────────────────────────────────────

class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id                = Column(Integer, primary_key=True, index=True)
    poliza_id         = Column(Integer, ForeignKey("polizas.id"), nullable=False)
    tipo              = Column(String(100), nullable=False)
    completado        = Column(Boolean, default=False, nullable=False)
    completado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    completado_en     = Column(DateTime(timezone=True), nullable=True)
    rol_responsable   = Column(SAEnum(RolUsuario, name="rolusuario", create_type=True), nullable=False)
    notas             = Column(Text, nullable=True)
    datos_extra       = Column(JSON, nullable=True)  # "metadata" es reservado por SQLAlchemy
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    poliza         = relationship("Poliza", back_populates="checklist_items")
    completado_por = relationship("Usuario", foreign_keys=[completado_por_id])


# ─────────────────────────────────────────────────────────────────
# USUARIO  (ajusta a tu modelo existente si ya lo tienes)
# ─────────────────────────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id     = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    email  = Column(String(200), unique=True, nullable=False, index=True)
    rol    = Column(SAEnum(RolUsuario, name="rolusuario"), nullable=False)
    activo = Column(Boolean, default=True)

    polizas = relationship("Poliza", back_populates="solicitante")
