"""
Modelo: Usuario
Funcionarios de Idexud / área jurídica que acceden al sistema.
Roles:
  - ADMIN       : Configuración del sistema, CRUD completo
  - JURIDICO    : Revisión y aprobación de pólizas
  - OPERATIVO   : Carga y seguimiento de pólizas
  - SOLO_LECTURA: Consulta sin modificación (supervisores externos)
"""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RolUsuario(str, PyEnum):
    ADMIN = "ADMIN"
    JURIDICO = "JURIDICO"
    OPERATIVO = "OPERATIVO"
    SOLO_LECTURA = "SOLO_LECTURA"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True, index=True)
    nombre_completo: Mapped[str] = mapped_column(String(200), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(
        Enum(RolUsuario, name="rol_usuario_enum"),
        nullable=False,
        default=RolUsuario.OPERATIVO,
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ultimo_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Auditoría
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Usuario(id={self.id}, email='{self.email}', rol={self.rol})>"
