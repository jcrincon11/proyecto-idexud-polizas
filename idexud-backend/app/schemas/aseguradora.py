"""
app/schemas/aseguradora.py
Schemas mínimos para listar aseguradoras en selects del frontend.
"""
from pydantic import Field
from app.schemas.base import SchemaBase


class AseguradoraCreate(SchemaBase):
    nombre:            str = Field(..., min_length=2, max_length=200)
    nit:               str = Field(..., min_length=6, max_length=20)
    contacto_nombre:   str | None = None
    contacto_email:    str | None = None
    contacto_telefono: str | None = None


class AseguradoraResponse(SchemaBase):
    id:                int
    nombre:            str
    nit:               str
    contacto_email:    str | None = None
    contacto_telefono: str | None = None
    activa:            bool
