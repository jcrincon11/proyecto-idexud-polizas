"""
Modelo: AlertaVencimiento
Registra cada notificación enviada por el sistema cuando una póliza
está próxima a vencer. Sirve como log de auditoría y evita re-envíos.

El scheduler (APScheduler/Celery) crea registros aquí cada vez que
despacha un correo de alerta.
"""

from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.poliza import Poliza


class CanalAlerta(str, PyEnum):
    EMAIL = "EMAIL"
    SISTEMA = "SISTEMA"       # Notificación interna en la app
    WHATSAPP = "WHATSAPP"    # Futuro
    SMS = "SMS"               # Futuro


class EstadoAlerta(str, PyEnum):
    PENDIENTE = "PENDIENTE"   # Programada, aún no enviada
    ENVIADA = "ENVIADA"       # Correo/notif. despachado exitosamente
    FALLIDA = "FALLIDA"       # Error en el envío
    IGNORADA = "IGNORADA"     # Usuario descartó la alerta


class AlertaVencimiento(Base):
    __tablename__ = "alertas_vencimiento"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    poliza_id: Mapped[int] = mapped_column(
        ForeignKey("polizas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Cuándo vence la póliza al momento de generar la alerta
    dias_restantes: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Días que faltaban para el vencimiento al crear la alerta"
    )

    # Canal y destinatario
    canal: Mapped[CanalAlerta] = mapped_column(
        Enum(CanalAlerta, name="canal_alerta_enum"),
        nullable=False,
        default=CanalAlerta.EMAIL,
    )
    destinatario: Mapped[str] = mapped_column(
        String(254), nullable=False,
        comment="Email o identificador del destinatario"
    )

    # Estado del envío
    estado: Mapped[EstadoAlerta] = mapped_column(
        Enum(EstadoAlerta, name="estado_alerta_enum"),
        nullable=False,
        default=EstadoAlerta.PENDIENTE,
        index=True,
    )
    mensaje_error: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Descripción del error si el estado es FALLIDA"
    )
    leida: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Timestamps
    programada_para: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        comment="Momento en que se programó el envío"
    )
    enviada_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        comment="Momento real en que se despachó el mensaje"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    poliza: Mapped["Poliza"] = relationship("Poliza", back_populates="alertas")

    def __repr__(self) -> str:
        return (
            f"<AlertaVencimiento(id={self.id}, poliza_id={self.poliza_id}, "
            f"dias_restantes={self.dias_restantes}, estado={self.estado})>"
        )
