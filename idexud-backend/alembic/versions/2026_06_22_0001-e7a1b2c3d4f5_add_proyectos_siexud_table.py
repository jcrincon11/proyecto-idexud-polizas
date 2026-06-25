"""add proyectos_siexud table

Revision ID: e7a1b2c3d4f5
Revises: c6d0e4f3a2b1
Create Date: 2026-06-22 00:01:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "e7a1b2c3d4f5"
down_revision = "c6d0e4f3a2b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "proyectos_siexud",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("numero_interno", sa.Integer(), nullable=False),
        sa.Column("numero_externo", sa.String(length=100), nullable=True),
        sa.Column("anio", sa.Integer(), nullable=True),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("objeto", sa.Text(), nullable=True),
        sa.Column("estado", sa.String(length=50), nullable=True),
        sa.Column("tipo_financiacion", sa.String(length=200), nullable=True),
        sa.Column("region_impactada", sa.String(length=100), nullable=True),
        sa.Column("region_codigo", sa.String(length=50), nullable=True),
        sa.Column("entidad_contratante", sa.String(length=300), nullable=True),
        sa.Column("dependencia_ejecutora", sa.String(length=300), nullable=True),
        sa.Column("supervisor", sa.String(length=200), nullable=True),
        sa.Column("correo_principal", sa.String(length=200), nullable=True),
        sa.Column("fecha_suscripcion", sa.Date(), nullable=True),
        sa.Column("fecha_inicio", sa.Date(), nullable=True),
        sa.Column("fecha_fin_original", sa.Date(), nullable=True),
        sa.Column("fecha_fin_vigente", sa.Date(), nullable=True),
        sa.Column("prorrogado", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("num_prorrogas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("num_modificaciones", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("valor_original", sa.Numeric(precision=20, scale=2), nullable=True),
        sa.Column("total_adicionado", sa.Numeric(precision=20, scale=2), nullable=True),
        sa.Column("valor_vigente", sa.Numeric(precision=20, scale=2), nullable=True),
        sa.Column("aporte_entidad", sa.Numeric(precision=20, scale=2), nullable=True),
        sa.Column("aporte_universidad", sa.Numeric(precision=20, scale=2), nullable=True),
        sa.Column("beneficio_institucional", sa.Numeric(precision=20, scale=2), nullable=True),
        sa.Column("pct_beneficio", sa.Integer(), nullable=True),
        sa.Column("acto_administrativo", sa.String(length=200), nullable=True),
        sa.Column("enlace_secop", sa.String(length=500), nullable=True),
        sa.Column("codigo_contable", sa.String(length=50), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_proyectos_siexud_id", "proyectos_siexud", ["id"], unique=False)
    op.create_index(
        "ix_proyectos_siexud_numero_interno",
        "proyectos_siexud",
        ["numero_interno"],
        unique=True,
    )
    op.create_index(
        "ix_proyectos_siexud_estado", "proyectos_siexud", ["estado"], unique=False
    )
    op.create_index(
        "ix_proyectos_siexud_region_codigo",
        "proyectos_siexud",
        ["region_codigo"],
        unique=False,
    )
    op.create_index(
        "ix_proyectos_siexud_entidad_contratante",
        "proyectos_siexud",
        ["entidad_contratante"],
        unique=False,
    )
    op.create_index(
        "ix_proyectos_siexud_fecha_fin_vigente",
        "proyectos_siexud",
        ["fecha_fin_vigente"],
        unique=False,
    )
    op.create_index(
        "ix_proyectos_siexud_codigo_contable",
        "proyectos_siexud",
        ["codigo_contable"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_proyectos_siexud_codigo_contable", table_name="proyectos_siexud")
    op.drop_index("ix_proyectos_siexud_fecha_fin_vigente", table_name="proyectos_siexud")
    op.drop_index("ix_proyectos_siexud_entidad_contratante", table_name="proyectos_siexud")
    op.drop_index("ix_proyectos_siexud_region_codigo", table_name="proyectos_siexud")
    op.drop_index("ix_proyectos_siexud_estado", table_name="proyectos_siexud")
    op.drop_index("ix_proyectos_siexud_numero_interno", table_name="proyectos_siexud")
    op.drop_index("ix_proyectos_siexud_id", table_name="proyectos_siexud")
    op.drop_table("proyectos_siexud")
