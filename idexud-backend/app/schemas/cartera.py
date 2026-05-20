"""
app/schemas/cartera.py
=======================
Schemas Pydantic para el módulo de Cartera.

El módulo de cartera es una vista financiera sobre la tabla polizas:
registra si IDEXUD ya recibió el reintegro de la prima por parte del
centro de costos solicitante.

Exporta:
  CarteraResponse  → respuesta de GET /cartera/ y PATCH /cartera/{id}
  CarteraUpdate    → body de PATCH /cartera/{id}
  CarteraListResponse → envuelve la lista paginada
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from pydantic import Field

from app.models.poliza import EstadoCartera
from app.schemas.base import SchemaBase

if TYPE_CHECKING:
    from app.models.poliza import Poliza


class CarteraResponse(SchemaBase):
    """Proyección de una póliza enfocada en los datos de cartera."""

    id:                       int
    aseguradora:              str
    numero_poliza:            str
    centro_costo_solicitante: str | None = None
    centro_costo_pagador:     str | None = None
    estado_cartera:           EstadoCartera | None = None
    orden_pago_numero:        str | None = None
    orden_pago_fecha:         date | None = None
    enlace_soporte_pago:      str | None = None
    valor_poliza:             Decimal = Decimal("0")

    @classmethod
    def from_poliza(cls, poliza: "Poliza") -> "CarteraResponse":
        """Construye la respuesta desde un ORM Poliza con aseguradora cargada."""
        return cls(
            id=poliza.id,
            aseguradora=(
                poliza.aseguradora.nombre
                if poliza.aseguradora
                else "—"
            ),
            numero_poliza=poliza.numero_poliza or "",
            centro_costo_solicitante=poliza.centro_costo_solicitante,
            centro_costo_pagador=poliza.centro_costo_pagador,
            estado_cartera=poliza.estado_cartera,
            orden_pago_numero=poliza.orden_pago_numero,
            orden_pago_fecha=poliza.orden_pago_fecha,
            enlace_soporte_pago=poliza.enlace_soporte_pago,
            valor_poliza=poliza.valor_asegurado or Decimal("0"),
        )


class CarteraUpdate(SchemaBase):
    """
    Body de PATCH /cartera/{id}.
    Solo se actualiza lo que el cliente envía (PATCH semántico).
    Todos los campos son opcionales.
    """
    estado_cartera:           EstadoCartera | None = None
    orden_pago_numero:        str | None = Field(None, max_length=50)
    orden_pago_fecha:         date | None = None
    enlace_soporte_pago:      str | None = Field(None, max_length=500)
    centro_costo_solicitante: str | None = Field(None, max_length=100)
    centro_costo_pagador:     str | None = Field(None, max_length=100)


class CarteraListResponse(SchemaBase):
    """Envuelve la lista de registros de cartera con metadatos de paginación."""
    items: list[CarteraResponse]
    total: int
    pagina: int = 1
    por_pagina: int = 50
