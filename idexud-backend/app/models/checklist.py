"""
Modelo: ChecklistExpedicion
Trazabilidad del proceso de expedición/radicación de una póliza.
Cada póliza tiene UN checklist con pasos discretos que van marcándose
conforme el contratista entrega documentos y el área jurídica los valida.

Los pasos son configurables, pero se proveen defaults para el flujo
estándar de Idexud - Universidad Distrital.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.poliza import Poliza


class ChecklistExpedicion(Base):
    """
    Cada campo booleano representa un paso del proceso de expedición.
    Los campos _fecha y _responsable son opcionales y registran cuándo
    y quién completó cada paso (trazabilidad de auditoría).
    
    PASOS DEL FLUJO ESTÁNDAR IDEXUD:
      1.  Solicitud de póliza recibida
      2.  Documentos del contratista verificados
      3.  Borrador de póliza revisado
      4.  Póliza aprobada por jurídica
      5.  Póliza firmada por aseguradora
      6.  Póliza radicada en Idexud
      7.  Póliza ingresada al sistema
      8.  Notificación enviada al supervisor del contrato
      9.  Incluida en reporte de cartera
      10. Archivada (físico + digital)
    """
    __tablename__ = "checklist_expedicion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    poliza_id: Mapped[int] = mapped_column(
        ForeignKey("polizas.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,        # 1-a-1 con Poliza
        index=True,
    )

    # ------------------------------------------------------------------
    # PASO 1: Solicitud de póliza recibida
    # ------------------------------------------------------------------
    paso1_solicitud_recibida: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso1_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paso1_responsable: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # ------------------------------------------------------------------
    # PASO 2: Documentos del contratista verificados
    # ------------------------------------------------------------------
    paso2_docs_verificados: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso2_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paso2_responsable: Mapped[str | None] = mapped_column(String(150), nullable=True)
    paso2_observacion: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Documentos faltantes o con observación"
    )

    # ------------------------------------------------------------------
    # PASO 3: Borrador de póliza revisado por el área jurídica
    # ------------------------------------------------------------------
    paso3_borrador_revisado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso3_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paso3_responsable: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # ------------------------------------------------------------------
    # PASO 4: Póliza aprobada por el área jurídica
    # ------------------------------------------------------------------
    paso4_aprobada_juridica: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso4_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paso4_responsable: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # ------------------------------------------------------------------
    # PASO 5: Póliza firmada/emitida por la aseguradora
    # ------------------------------------------------------------------
    paso5_emitida_aseguradora: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso5_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ------------------------------------------------------------------
    # PASO 6: Póliza radicada ante Idexud (número de radicado asignado)
    # ------------------------------------------------------------------
    paso6_radicada_idexud: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso6_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paso6_numero_radicado: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ------------------------------------------------------------------
    # PASO 7: Ingresada al sistema de información
    # ------------------------------------------------------------------
    paso7_ingresada_sistema: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso7_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paso7_responsable: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # ------------------------------------------------------------------
    # PASO 8: Supervisor del contrato notificado
    # ------------------------------------------------------------------
    paso8_supervisor_notificado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso8_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paso8_email_destino: Mapped[str | None] = mapped_column(String(254), nullable=True)

    # ------------------------------------------------------------------
    # PASO 9: Incluida en reporte de cartera / legalizacion
    # ------------------------------------------------------------------
    paso9_incluida_cartera: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso9_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ------------------------------------------------------------------
    # PASO 10: Archivada (físico y digital)
    # ------------------------------------------------------------------
    paso10_archivada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paso10_fecha: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paso10_ubicacion_fisico: Mapped[str | None] = mapped_column(
        String(200), nullable=True,
        comment="Ej: Carpeta 42 - Archivador 3 - Bodega Norte"
    )

    # ------------------------------------------------------------------
    # Notas generales del checklist
    # ------------------------------------------------------------------
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relaciones
    poliza: Mapped["Poliza"] = relationship("Poliza", back_populates="checklist")

    # ------------------------------------------------------------------
    # Propiedades calculadas
    # ------------------------------------------------------------------
    TOTAL_PASOS = 10

    @property
    def pasos_completados(self) -> int:
        """Cuenta cuántos de los 10 pasos han sido marcados como True."""
        return sum([
            self.paso1_solicitud_recibida,
            self.paso2_docs_verificados,
            self.paso3_borrador_revisado,
            self.paso4_aprobada_juridica,
            self.paso5_emitida_aseguradora,
            self.paso6_radicada_idexud,
            self.paso7_ingresada_sistema,
            self.paso8_supervisor_notificado,
            self.paso9_incluida_cartera,
            self.paso10_archivada,
        ])

    @property
    def porcentaje_completitud(self) -> float:
        """Retorna el progreso del checklist como porcentaje (0.0 – 100.0)."""
        return round((self.pasos_completados / self.TOTAL_PASOS) * 100, 1)

    @property
    def esta_completo(self) -> bool:
        return self.pasos_completados == self.TOTAL_PASOS

    def __repr__(self) -> str:
        return (
            f"<ChecklistExpedicion(poliza_id={self.poliza_id}, "
            f"progreso={self.porcentaje_completitud}%)>"
        )
