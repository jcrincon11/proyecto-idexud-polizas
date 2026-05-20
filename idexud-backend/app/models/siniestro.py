"""
Modelo: Siniestro
Registra los eventos de reclamación o siniestros asociados a una póliza.
Un siniestro puede estar en varias etapas: reportado, en investigación,
aprobado por aseguradora, pagado o negado.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.poliza import Poliza


class EstadoSiniestro(str, PyEnum):
    REPORTADO = "REPORTADO"                # Se registró el evento
    EN_INVESTIGACION = "EN_INVESTIGACION"  # La aseguradora investiga
    APROBADO = "APROBADO"                  # Aseguradora acepta el pago
    PAGADO = "PAGADO"                      # El siniestro fue indemnizado
    NEGADO = "NEGADO"                      # Aseguradora rechazó la reclamación
    CERRADO = "CERRADO"                    # Expediente cerrado sin pago


class Siniestro(Base):
    __tablename__ = "siniestros"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    poliza_id: Mapped[int] = mapped_column(
        ForeignKey("polizas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Datos del evento
    numero_radicado: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True,
        comment="Número de radicación ante la aseguradora"
    )
    fecha_ocurrencia: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_reporte: Mapped[date] = mapped_column(Date, nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)

    # Financiero
    valor_reclamado: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=20, scale=2), nullable=True,
        comment="Valor reclamado a la aseguradora en COP"
    )
    valor_reconocido: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=20, scale=2), nullable=True,
        comment="Valor efectivamente pagado/reconocido por la aseguradora en COP"
    )

    estado: Mapped[EstadoSiniestro] = mapped_column(
        Enum(EstadoSiniestro, name="estado_siniestro_enum"),
        nullable=False,
        default=EstadoSiniestro.REPORTADO,
        index=True,
    )

    # Resolución
    fecha_resolucion: Mapped[date | None] = mapped_column(Date, nullable=True)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    ruta_documento_soporte: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
        comment="Ruta al documento de soporte del siniestro"
    )

    # Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relaciones
    poliza: Mapped["Poliza"] = relationship("Poliza", back_populates="siniestros")

    def __repr__(self) -> str:
        return (
            f"<Siniestro(id={self.id}, poliza_id={self.poliza_id}, "
            f"estado={self.estado}, fecha={self.fecha_ocurrencia})>"
        )
