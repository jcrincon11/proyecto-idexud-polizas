"""
app/schemas/cartera.py
=======================
Schemas Pydantic para el módulo de Cartera.

El módulo de cartera es una vista financiera sobre la tabla polizas:
registra si IDEXUD ya recibió el reintegro de la prima por parte del
centro de costos solicitante.

Exporta:
  CarteraResponse       → respuesta de GET /cartera/ y PATCH /cartera/{id}
  CarteraUpdate         → body de PATCH /cartera/{id}
  CarteraListResponse   → envuelve la lista paginada
  CarteraResumenItem    → agregado financiero por corredor
  CarteraResumenResponse → envuelve el listado de resúmenes con gran total
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from pydantic import Field, computed_field

from app.models.poliza import EstadoCartera
from app.schemas.base import SchemaBase

if TYPE_CHECKING:
    from app.models.poliza import Poliza


# ══════════════════════════════════════════════════════════════════════════════
# CARTERA CRUD
# ══════════════════════════════════════════════════════════════════════════════

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
    La validación de campos obligatorios para PAGADO se realiza en el endpoint,
    donde se pueden combinar los valores del payload con los ya guardados en BD.
    Esto evita rechazar un PATCH válido del tipo {"estado_cartera": "PAGADO"}
    cuando orden_pago_numero ya fue registrado en una operación anterior.
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


# ══════════════════════════════════════════════════════════════════════════════
# RESUMEN FINANCIERO POR CORREDOR
# ══════════════════════════════════════════════════════════════════════════════

class CarteraResumenItem(SchemaBase):
    """
    Agregado financiero de cartera para un corredor.
    Generado por GET /cartera/resumen.
    """
    corredor_id:      int | None = None
    corredor_nombre:  str = "Sin corredor"
    corredor_empresa: str = "—"
    total_polizas:    int = 0
    total_pendiente:  Decimal = Decimal("0")
    total_abonado:    Decimal = Decimal("0")
    total_pagado:     Decimal = Decimal("0")

    @computed_field
    @property
    def total_cartera(self) -> Decimal:
        """Suma de los tres estados (excluye NO_APLICA que no entra en el resumen)."""
        return self.total_pendiente + self.total_abonado + self.total_pagado

    @computed_field
    @property
    def pct_pagado(self) -> float:
        """% del total que ya fue pagado (0–100)."""
        total = float(self.total_cartera)
        if total == 0:
            return 0.0
        return round(float(self.total_pagado) / total * 100, 1)

    @computed_field
    @property
    def pct_gestionado(self) -> float:
        """% del total ya gestionado (abonado + pagado)."""
        total = float(self.total_cartera)
        if total == 0:
            return 0.0
        return round(float(self.total_abonado + self.total_pagado) / total * 100, 1)


class CarteraResumenResponse(SchemaBase):
    """
    Respuesta de GET /cartera/resumen.
    Lista de ítems por corredor + gran total de toda la cartera.
    """
    items:               list[CarteraResumenItem]
    gran_total_pendiente: Decimal = Decimal("0")
    gran_total_abonado:   Decimal = Decimal("0")
    gran_total_pagado:    Decimal = Decimal("0")

    @computed_field
    @property
    def gran_total_cartera(self) -> Decimal:
        return self.gran_total_pendiente + self.gran_total_abonado + self.gran_total_pagado

    @computed_field
    @property
    def gran_pct_pagado(self) -> float:
        total = float(self.gran_total_cartera)
        if total == 0:
            return 0.0
        return round(float(self.gran_total_pagado) / total * 100, 1)
