"""
Modelo: Contratista
Persona natural o jurídica que debe acreditar pólizas ante la Universidad Distrital / Idexud.
"""

from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.poliza import Poliza


class TipoContratista(str, PyEnum):
    PERSONA_NATURAL = "PERSONA_NATURAL"
    PERSONA_JURIDICA = "PERSONA_JURIDICA"
    CONSORCIO = "CONSORCIO"
    UNION_TEMPORAL = "UNION_TEMPORAL"


class Contratista(Base):
    __tablename__ = "contratistas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Identificación
    tipo: Mapped[TipoContratista] = mapped_column(
        Enum(TipoContratista, name="tipo_contratista_enum"),
        nullable=False,
        default=TipoContratista.PERSONA_NATURAL,
    )
    nombre_razon_social: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    numero_identificacion: Mapped[str] = mapped_column(
        String(30), nullable=False, unique=True, index=True,
        comment="NIT o Cédula de ciudadanía según tipo_contratista"
    )
    digito_verificacion: Mapped[str | None] = mapped_column(
        String(1), nullable=True,
        comment="Dígito de verificación del NIT (solo para personas jurídicas)"
    )

    # Datos de contacto
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    direccion: Mapped[str | None] = mapped_column(Text, nullable=True)
    ciudad: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Representante legal (para jurídicas)
    rep_legal_nombre: Mapped[str | None] = mapped_column(String(150), nullable=True)
    rep_legal_cedula: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rep_legal_email: Mapped[str | None] = mapped_column(String(254), nullable=True)

    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relaciones
    polizas: Mapped[List["Poliza"]] = relationship("Poliza", back_populates="contratista")

    def __repr__(self) -> str:
        return (
            f"<Contratista(id={self.id}, nombre='{self.nombre_razon_social}', "
            f"nit='{self.numero_identificacion}')>"
        )
