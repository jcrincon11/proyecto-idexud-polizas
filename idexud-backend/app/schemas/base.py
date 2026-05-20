"""
app/schemas/base.py
===================
Tipos reutilizables, anotaciones y configuración base para todos los
schemas Pydantic del proyecto.

Exporta:
  - SchemaBase          → Configuración ORM compartida
  - CopAmount           → Tipo anotado para valores monetarios en COP
  - Porcentaje          → Tipo anotado para porcentajes (0.00 – 100.00)
  - format_cop          → Formatea un Decimal como "$1.250.000,00"
  - format_fecha_co     → Formatea una date como "15 de julio de 2024"
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict
from pydantic.functional_validators import AfterValidator


# ─────────────────────────────────────────────────────────────────────────────
# Configuración base compartida por TODOS los schemas
# ─────────────────────────────────────────────────────────────────────────────

class SchemaBase(BaseModel):
    """
    Clase raíz con configuración ORM y comportamiento estándar.

    - from_attributes=True   → Permite construir el schema desde un ORM object
                               (sqlalchemy model) sin necesidad de .model_dump()
    - populate_by_name=True  → Acepta tanto el alias como el nombre real del campo
    - str_strip_whitespace   → Limpia espacios al inicio/fin de strings
    - str_min_length=1       → Strings no pueden ser solo espacios vacíos
    """
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Tipos anotados para el dominio colombiano
# ─────────────────────────────────────────────────────────────────────────────

def _validar_cop(v: Decimal) -> Decimal:
    """Valida que un valor COP sea positivo y tenga máximo 2 decimales."""
    if v < Decimal("0"):
        raise ValueError("El valor en COP no puede ser negativo.")
    if v > Decimal("999_999_999_999_999.99"):
        raise ValueError("El valor excede el límite máximo permitido.")
    # Redondear a 2 decimales para evitar artefactos de float
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _validar_porcentaje(v: Decimal) -> Decimal:
    """Valida que el porcentaje esté entre 0 y 100."""
    if not (Decimal("0") <= v <= Decimal("100")):
        raise ValueError("El porcentaje debe estar entre 0.00 y 100.00.")
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# Tipo anotado: Decimal validado como valor monetario en COP
CopAmount = Annotated[Decimal, AfterValidator(_validar_cop)]

# Tipo anotado: Decimal validado como porcentaje
Porcentaje = Annotated[Decimal, AfterValidator(_validar_porcentaje)]


# ─────────────────────────────────────────────────────────────────────────────
# Formateadores de presentación (usados en campos computed del PolizaResponse)
# ─────────────────────────────────────────────────────────────────────────────

_MESES_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}


def format_cop(valor: Decimal | None) -> str | None:
    """
    Formatea un Decimal como moneda COP con separador de miles colombiano.

    Ejemplos:
      Decimal("1250000")    → "$ 1.250.000,00"
      Decimal("75000000.5") → "$ 75.000.000,50"
      None                  → None
    """
    if valor is None:
        return None
    # Separador de miles con punto, decimales con coma (estándar colombiano)
    entero, *decimales = f"{valor:,.2f}".split(".")
    entero_co = entero.replace(",", ".")
    decimal_co = decimales[0] if decimales else "00"
    return f"$ {entero_co},{decimal_co}"


def format_fecha_co(fecha: date | None) -> str | None:
    """
    Formatea una fecha en español colombiano.

    Ejemplos:
      date(2024, 7, 15) → "15 de julio de 2024"
      None              → None
    """
    if fecha is None:
        return None
    mes = _MESES_ES[fecha.month]
    return f"{fecha.day} de {mes} de {fecha.year}"
