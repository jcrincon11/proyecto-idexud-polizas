"""
app/schemas/contratista.py
Schemas mínimos para listar contratistas en selects del frontend.
"""
from pydantic import Field
from app.schemas.base import SchemaBase
from app.models.contratista import TipoContratista


class ContratistaCreate(SchemaBase):
    tipo:                   TipoContratista = TipoContratista.PERSONA_JURIDICA
    nombre_razon_social:    str = Field(..., min_length=2, max_length=300)
    numero_identificacion:  str = Field(..., min_length=6, max_length=30)
    email:                  str | None = None
    telefono:               str | None = None


class ContratistaResponse(SchemaBase):
    id:                     int
    tipo:                   TipoContratista
    nombre_razon_social:    str
    numero_identificacion:  str
    # Campos requeridos por el Motor de Alertas para envío de notificaciones
    email:                  str | None = None   # TODO: Conectar a servicio de mensajería — usado como destinatario_email
    telefono:               str | None = None   # TODO: Conectar a servicio de mensajería — usado como destinatario_sms
    activo:                 bool
