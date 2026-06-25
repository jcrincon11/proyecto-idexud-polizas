"""add_corredores_table_and_fk_polizas

Revision ID: a4f8b2c1d9e0
Revises: d15e0db15bee
Create Date: 2026-06-09 00:01:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a4f8b2c1d9e0'
down_revision: Union[str, None] = 'd15e0db15bee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabla corredores
    op.create_table(
        'corredores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre_corredor', sa.String(length=200), nullable=False,
                  comment='Nombre completo del corredor principal'),
        sa.Column('empresa', sa.String(length=200), nullable=False,
                  comment='Razón social de la correduría'),
        sa.Column('ayudante_nombre', sa.String(length=200), nullable=True,
                  comment='Nombre del contacto de apoyo / ayudante'),
        sa.Column('email_principal', sa.String(length=254), nullable=False,
                  comment='Correo electrónico del corredor principal'),
        sa.Column('email_ayudante', sa.String(length=254), nullable=True,
                  comment='Correo electrónico del ayudante / contacto secundario'),
        sa.Column('telefono_principal', sa.String(length=20), nullable=False,
                  comment='Teléfono / celular del corredor principal'),
        sa.Column('telefono_ayudante', sa.String(length=20), nullable=True,
                  comment='Teléfono / celular del ayudante'),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('empresa', name='uq_corredores_empresa'),
    )
    op.create_index('ix_corredores_id', 'corredores', ['id'], unique=False)
    op.create_index('ix_corredores_nombre_corredor', 'corredores', ['nombre_corredor'], unique=False)
    op.create_index('ix_corredores_empresa', 'corredores', ['empresa'], unique=False)

    # FK corredor_id en polizas
    op.add_column(
        'polizas',
        sa.Column('corredor_id', sa.Integer(), nullable=True,
                  comment='Corredor de seguros que intermedió esta póliza')
    )
    op.create_index('ix_polizas_corredor_id', 'polizas', ['corredor_id'], unique=False)
    op.create_foreign_key(
        'fk_polizas_corredor_id',
        'polizas', 'corredores',
        ['corredor_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_polizas_corredor_id', 'polizas', type_='foreignkey')
    op.drop_index('ix_polizas_corredor_id', table_name='polizas')
    op.drop_column('polizas', 'corredor_id')

    op.drop_index('ix_corredores_empresa', table_name='corredores')
    op.drop_index('ix_corredores_nombre_corredor', table_name='corredores')
    op.drop_index('ix_corredores_id', table_name='corredores')
    op.drop_table('corredores')
