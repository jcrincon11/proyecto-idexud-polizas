"""
Modelo: Aseguradora
Representa las compañías aseguradoras con las que trabaja la oficina Idexud.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.poliza import Poliza


class Aseguradora(Base):
    __tablename__ = "aseguradoras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    nit: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    contacto_nombre: Mapped[str | None] = mapped_column(String(150), nullable=True)
    contacto_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    contacto_telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    direccion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relaciones
    polizas: Mapped[List["Poliza"]] = relationship("Poliza", back_populates="aseguradora")

    def __repr__(self) -> str:
        return f"<Aseguradora(id={self.id}, nombre='{self.nombre}', nit='{self.nit}')>"
