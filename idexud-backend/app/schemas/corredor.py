"""
app/schemas/corredor.py
Schemas Pydantic v2 para el recurso Corredor.
"""
from datetime import datetime

from pydantic import Field
from app.schemas.base import SchemaBase


class CorredorBase(SchemaBase):
    nombre_corredor: str = Field(..., min_length=2, max_length=200)
    empresa: str = Field(..., min_length=2, max_length=200)
    ayudante_nombre: str | None = Field(default=None, max_length=200)
    email_principal: str = Field(..., max_length=254)
    email_ayudante: str | None = Field(default=None, max_length=254)
    telefono_principal: str = Field(..., max_length=20)
    telefono_ayudante: str | None = Field(default=None, max_length=20)
    activo: bool = True


class CorredorCreate(CorredorBase):
    pass


class CorredorUpdate(SchemaBase):
    nombre_corredor: str | None = Field(default=None, min_length=2, max_length=200)
    empresa: str | None = Field(default=None, min_length=2, max_length=200)
    ayudante_nombre: str | None = None
    email_principal: str | None = None
    email_ayudante: str | None = None
    telefono_principal: str | None = None
    telefono_ayudante: str | None = None
    activo: bool | None = None


class CorredorResponse(CorredorBase):
    id: int
    polizas_activas: int = 0
    polizas_total: int = 0
    created_at: datetime
    updated_at: datetime


class CorredorResumen(SchemaBase):
    """Schema compacto para incrustar en PolizaResponse."""
    id: int
    nombre_corredor: str
    empresa: str
    email_principal: str
    telefono_principal: str
