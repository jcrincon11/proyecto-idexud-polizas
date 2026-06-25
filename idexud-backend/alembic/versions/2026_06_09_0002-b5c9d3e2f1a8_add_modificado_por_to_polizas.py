"""add_modificado_por_to_polizas

Revision ID: b5c9d3e2f1a8
Revises: a4f8b2c1d9e0
Create Date: 2026-06-09 00:02:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b5c9d3e2f1a8'
down_revision: Union[str, None] = 'a4f8b2c1d9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'polizas',
        sa.Column(
            'modificado_por',
            sa.String(length=150),
            nullable=True,
            comment='Nombre/email del usuario que realizó la última modificación',
        ),
    )


def downgrade() -> None:
    op.drop_column('polizas', 'modificado_por')
