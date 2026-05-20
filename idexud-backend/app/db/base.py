"""
Base declarativa de SQLAlchemy 2.0.
Todos los modelos deben importar Base desde aquí.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Clase base para todos los modelos ORM del proyecto."""
    pass
