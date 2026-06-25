"""
Modelo: Poliza
Tabla central del sistema. Almacena cada póliza vinculada a un contrato/contratista en Idexud.

Tipos de póliza comunes en contratación pública colombiana:
  - CUMPLIMIENTO         : Garantiza la ejecución del contrato
  - RCE                  : Responsabilidad Civil Extracontractual
  - CALIDAD_SERVICIO     : Calidad del bien o servicio prestado
  - PAGO_SALARIOS        : Pago de salarios y prestaciones sociales
  - ESTABILIDAD_OBRA     : Estabilidad de la obra
  - CORRECTO_MANEJO      : Correcto manejo del anticipo
  - RESPONSABILIDAD_CIVIL: RC general (errores y omisiones, etc.)
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, List

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.aseguradora import Aseguradora
    from app.models.contratista import Contratista
    from app.models.corredor import Corredor
    from app.models.siniestro import Siniestro
    from app.models.checklist import ChecklistExpedicion
    from app.models.alerta import AlertaVencimiento


# ---------------------------------------------------------------------------
# Enumeraciones del dominio
# ---------------------------------------------------------------------------

class TipoPoliza(str, PyEnum):
    CUMPLIMIENTO = "CUMPLIMIENTO"
    RCE = "RCE"
    CALIDAD_SERVICIO = "CALIDAD_SERVICIO"
    PAGO_SALARIOS = "PAGO_SALARIOS"
    ESTABILIDAD_OBRA = "ESTABILIDAD_OBRA"
    CORRECTO_MANEJO = "CORRECTO_MANEJO"
    RESPONSABILIDAD_CIVIL = "RESPONSABILIDAD_CIVIL"
    OTRO = "OTRO"


class EstadoPoliza(str, PyEnum):
    """
    Ciclo de vida de una póliza:
      BORRADOR → PENDIENTE_REVISION → ACTIVA → (POR_VENCER | VENCIDA | RENOVADA | ANULADA)
    """
    BORRADOR = "BORRADOR"                  # Cargada aún no validada
    PENDIENTE_REVISION = "PENDIENTE_REVISION"  # En revisión por el área jurídica
    ACTIVA = "ACTIVA"                      # Vigente y aprobada
    POR_VENCER = "POR_VENCER"             # Próxima a vencer (< umbral de días configurado)
    VENCIDA = "VENCIDA"                   # Pasó la fecha de vigencia_hasta
    RENOVADA = "RENOVADA"                 # Reemplazada por una nueva póliza
    ANULADA = "ANULADA"                   # Cancelada por cualquier motivo


class ModalidadGarantia(str, PyEnum):
    """
    En Colombia, las garantías pueden ser pólizas de seguro, pagarés,
    fiducias, entre otras. El sistema soporta las más comunes.
    """
    POLIZA_SEGURO = "POLIZA_SEGURO"
    PAGARE = "PAGARE"
    FIDUCIA = "FIDUCIA"
    GARANTIA_BANCARIA = "GARANTIA_BANCARIA"
    OTRO = "OTRO"


class EstadoCartera(str, PyEnum):
    """
    Estado de la gestión financiera/reintegro de la prima entre
    el centro de costos solicitante e IDEXUD como pagador.
    """
    PENDIENTE_REINTEGRO = "PENDIENTE_REINTEGRO"  # IDEXUD pagó, aún no recibe el reintegro
    ABONADO = "ABONADO"                          # Reintegro parcial recibido
    PAGADO = "PAGADO"                            # Reintegro completo, cuenta saldada
    NO_APLICA = "NO_APLICA"                      # La póliza no genera reintegro


# ---------------------------------------------------------------------------
# Modelo principal
# ---------------------------------------------------------------------------

class Poliza(Base):
    __tablename__ = "polizas"

    # ------------------------------------------------------------------
    # Identificación
    # ------------------------------------------------------------------
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    numero_poliza: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True,
        comment="Número de póliza emitido por la aseguradora"
    )
    tipo: Mapped[TipoPoliza] = mapped_column(
        Enum(TipoPoliza, name="tipo_poliza_enum"),
        nullable=False,
        index=True,
    )
    modalidad: Mapped[ModalidadGarantia] = mapped_column(
        Enum(ModalidadGarantia, name="modalidad_garantia_enum"),
        nullable=False,
        default=ModalidadGarantia.POLIZA_SEGURO,
    )
    estado: Mapped[EstadoPoliza] = mapped_column(
        Enum(EstadoPoliza, name="estado_poliza_enum"),
        nullable=False,
        default=EstadoPoliza.BORRADOR,
        index=True,
    )

    # ------------------------------------------------------------------
    # Vigencia
    # ------------------------------------------------------------------
    vigencia_desde: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    vigencia_hasta: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # ------------------------------------------------------------------
    # Valores económicos
    # ------------------------------------------------------------------
    valor_asegurado: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False,
        comment="Valor cubierto en COP"
    )
    valor_prima: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=20, scale=2), nullable=True,
        comment="Prima pagada por el contratista en COP"
    )
    porcentaje_cobertura: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=5, scale=2), nullable=True,
        comment="Porcentaje del valor del contrato cubierto (ej. 10.00 para 10%)"
    )

    # ------------------------------------------------------------------
    # Referencia contractual
    # ------------------------------------------------------------------
    numero_contrato: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True,
        comment="Número del contrato asociado en la UD / Idexud"
    )
    objeto_contrato: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Objeto del contrato al que está vinculada la póliza"
    )
    valor_contrato: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=20, scale=2), nullable=True,
        comment="Valor total del contrato en COP"
    )
    numero_adicion: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="Número de adición o modificación contractual si aplica"
    )

    # ------------------------------------------------------------------
    # Relaciones con otras entidades (FK)
    # ------------------------------------------------------------------
    aseguradora_id: Mapped[int] = mapped_column(
        ForeignKey("aseguradoras.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    contratista_id: Mapped[int] = mapped_column(
        ForeignKey("contratistas.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    corredor_id: Mapped[int | None] = mapped_column(
        ForeignKey("corredores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Corredor de seguros que intermedió esta póliza"
    )

    # Póliza que reemplaza a esta (para renovaciones)
    poliza_anterior_id: Mapped[int | None] = mapped_column(
        ForeignKey("polizas.id", ondelete="SET NULL"),
        nullable=True,
        comment="ID de la póliza a la que ésta renueva/reemplaza"
    )

    # ------------------------------------------------------------------
    # Documentación
    # ------------------------------------------------------------------
    ruta_documento: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
        comment="Ruta relativa al PDF de la póliza almacenado en el servidor"
    )
    fecha_radicacion: Mapped[date | None] = mapped_column(
        Date, nullable=True,
        comment="Fecha en que el contratista radicó la póliza ante Idexud"
    )
    fecha_aprobacion: Mapped[date | None] = mapped_column(
        Date, nullable=True,
        comment="Fecha en que el área jurídica aprobó la póliza"
    )
    aprobado_por: Mapped[str | None] = mapped_column(
        String(150), nullable=True,
        comment="Nombre del funcionario que aprobó la póliza"
    )

    # ------------------------------------------------------------------
    # Flags y metadata
    # ------------------------------------------------------------------
    requiere_acta_inicio: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        comment="True si la póliza cubre desde el acta de inicio del contrato"
    )
    alertas_enviadas: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
        comment="Contador de alertas de vencimiento enviadas"
    )
    notas_internas: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Observaciones internas del área jurídica / Idexud"
    )
    modificado_por: Mapped[str | None] = mapped_column(
        String(150), nullable=True,
        comment="Nombre/email del usuario que realizó la última modificación"
    )

    # ------------------------------------------------------------------
    # Cartera — seguimiento financiero del reintegro de la prima
    # (campos añadidos en migración d15e0db15bee)
    # ------------------------------------------------------------------
    centro_costo_solicitante: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
        comment="ID/Código del proyecto que solicitó la póliza"
    )
    centro_costo_pagador: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
        comment="ID/Código del fondo IDEXUD de donde salió la plata"
    )
    estado_cartera: Mapped[EstadoCartera | None] = mapped_column(
        Enum(EstadoCartera, name="estadocarteraenum"),
        nullable=True,
        index=True,
        comment="Estado de la deuda con IDEXUD"
    )
    orden_pago_numero: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="Número de la Orden de Pago"
    )
    orden_pago_fecha: Mapped[date | None] = mapped_column(
        Date, nullable=True,
        comment="Fecha de la Orden de Pago"
    )
    enlace_soporte_pago: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
        comment="Link de Nextcloud con la documentación financiera"
    )

    # ------------------------------------------------------------------
    # Auditoría (timestamps)
    # ------------------------------------------------------------------
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ------------------------------------------------------------------
    # Relaciones ORM
    # ------------------------------------------------------------------
    aseguradora: Mapped["Aseguradora"] = relationship(
        "Aseguradora", back_populates="polizas"
    )
    contratista: Mapped["Contratista"] = relationship(
        "Contratista", back_populates="polizas"
    )
    corredor: Mapped["Corredor | None"] = relationship(
        "Corredor", back_populates="polizas"
    )
    poliza_anterior: Mapped["Poliza | None"] = relationship(
        "Poliza", remote_side="Poliza.id", foreign_keys=[poliza_anterior_id]
    )
    siniestros: Mapped[List["Siniestro"]] = relationship(
        "Siniestro", back_populates="poliza", cascade="all, delete-orphan"
    )
    checklist: Mapped["ChecklistExpedicion | None"] = relationship(
        "ChecklistExpedicion", back_populates="poliza", uselist=False,
        cascade="all, delete-orphan"
    )
    alertas: Mapped[List["AlertaVencimiento"]] = relationship(
        "AlertaVencimiento", back_populates="poliza", cascade="all, delete-orphan"
    )

    # ------------------------------------------------------------------
    # Propiedades calculadas (en Python, no en DB)
    # ------------------------------------------------------------------
    @property
    def dias_para_vencer(self) -> int:
        """Días que faltan para que venza la póliza (negativo = ya venció)."""
        return (self.vigencia_hasta - date.today()).days

    @property
    def esta_vigente(self) -> bool:
        return self.vigencia_desde <= date.today() <= self.vigencia_hasta

    @property
    def progreso_checklist(self) -> float:
        """Porcentaje de completitud del checklist de expedición (0–100)."""
        if not self.checklist:
            return 0.0
        return self.checklist.porcentaje_completitud

    def __repr__(self) -> str:
        return (
            f"<Poliza(id={self.id}, numero='{self.numero_poliza}', "
            f"tipo={self.tipo}, estado={self.estado})>"
        )
