"""
Modelo: Corredor
Representa los corredores de seguros (brokers) que intermedian
entre IDEXUD y las aseguradoras en la gestión de pólizas.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.poliza import Poliza


class Corredor(Base):
    __tablename__ = "corredores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    nombre_corredor: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True,
        comment="Nombre completo del corredor principal"
    )
    empresa: Mapped[str] = mapped_column(
        String(200), nullable=False, unique=True, index=True,
        comment="Razón social de la correduría"
    )
    ayudante_nombre: Mapped[str | None] = mapped_column(
        String(200), nullable=True,
        comment="Nombre del contacto de apoyo / ayudante"
    )
    email_principal: Mapped[str] = mapped_column(
        String(254), nullable=False,
        comment="Correo electrónico del corredor principal"
    )
    email_ayudante: Mapped[str | None] = mapped_column(
        String(254), nullable=True,
        comment="Correo electrónico del ayudante / contacto secundario"
    )
    telefono_principal: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="Teléfono / celular del corredor principal"
    )
    telefono_ayudante: Mapped[str | None] = mapped_column(
        String(20), nullable=True,
        comment="Teléfono / celular del ayudante"
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    modificado_por: Mapped[str | None] = mapped_column(
        String(150), nullable=True,
        comment="Nombre/email del usuario que realizó la última modificación"
    )

    # Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relaciones
    polizas: Mapped[List["Poliza"]] = relationship("Poliza", back_populates="corredor")

    def __repr__(self) -> str:
        return (
            f"<Corredor(id={self.id}, nombre='{self.nombre_corredor}', "
            f"empresa='{self.empresa}')>"
        )
