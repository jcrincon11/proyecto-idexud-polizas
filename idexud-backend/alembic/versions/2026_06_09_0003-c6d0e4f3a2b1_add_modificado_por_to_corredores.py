"""add_modificado_por_to_corredores

Revision ID: c6d0e4f3a2b1
Revises: b5c9d3e2f1a8
Create Date: 2026-06-09 00:03:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c6d0e4f3a2b1'
down_revision: Union[str, None] = 'b5c9d3e2f1a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'corredores',
        sa.Column(
            'modificado_por',
            sa.String(length=150),
            nullable=True,
            comment='Nombre/email del usuario que realizó la última modificación',
        ),
    )


def downgrade() -> None:
    op.drop_column('corredores', 'modificado_por')
