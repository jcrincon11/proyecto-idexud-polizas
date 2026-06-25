from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProyectoSiexud(Base):
    """Proyectos sincronizados desde la API SIEXUD (OFEX UD)."""

    __tablename__ = "proyectos_siexud"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Identificadores externos
    numero_interno: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    numero_externo: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Datos del proyecto
    anio: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    objeto: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    tipo_financiacion: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Geografía
    region_impactada: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region_codigo: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)

    # Entidades
    entidad_contratante: Mapped[str | None] = mapped_column(String(300), nullable=True, index=True)
    dependencia_ejecutora: Mapped[str | None] = mapped_column(String(300), nullable=True)
    supervisor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    correo_principal: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Fechas contractuales
    fecha_suscripcion: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_fin_original: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_fin_vigente: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    # Modificaciones
    prorrogado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    num_prorrogas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    num_modificaciones: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Valores económicos
    valor_original: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    total_adicionado: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    valor_vigente: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    aporte_entidad: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    aporte_universidad: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    beneficio_institucional: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    pct_beneficio: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Referencias
    acto_administrativo: Mapped[str | None] = mapped_column(String(200), nullable=True)
    enlace_secop: Mapped[str | None] = mapped_column(String(500), nullable=True)
    codigo_contable: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<ProyectoSiexud(id={self.id}, numero_interno={self.numero_interno}, nombre='{self.nombre[:40]}...')>"
