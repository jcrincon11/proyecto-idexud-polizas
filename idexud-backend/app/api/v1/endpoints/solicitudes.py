"""
app/api/v1/endpoints/solicitudes.py
=====================================
Flujo PMO — crea una póliza en estado BORRADOR con los datos mínimos.

Endpoints:
  GET  /solicitudes           → Lista todas las solicitudes PMO
  POST /solicitudes           → PMO crea solicitud inicial (genera código comprobante)
  GET  /solicitudes/{id}      → Consultar una solicitud por ID
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db
from app.models.aseguradora import Aseguradora
from app.models.checklist import ChecklistExpedicion
from app.models.contratista import Contratista
from app.models.poliza import EstadoPoliza, ModalidadGarantia, Poliza, TipoPoliza
from app.schemas.solicitud import (
    SolicitudCreate,
    SolicitudResponse,
    extraer_notas_pmo,
    generar_codigo_comprobante,
    generar_numero_radicado,
)

router = APIRouter(
    prefix="/solicitudes",
    tags=["Solicitudes (PMO — Borrador)"],
)

DbSession = Annotated[AsyncSession, Depends(get_db)]

# Mapeo tipo_garantia (PMO) → TipoPoliza (modelo)
_TIPO_MAP: dict[str, TipoPoliza] = {
    "POLIZA_CUMPLIMIENTO": TipoPoliza.CUMPLIMIENTO,
    "POLIZA_ANTICIPO":     TipoPoliza.CORRECTO_MANEJO,
    "POLIZA_CALIDAD":      TipoPoliza.CALIDAD_SERVICIO,
    "GARANTIA_BANCARIA":   TipoPoliza.OTRO,
    "PAGARE":              TipoPoliza.OTRO,
}

_TIPO_LABEL: dict[str, str] = {
    "POLIZA_CUMPLIMIENTO": "Póliza de Cumplimiento",
    "POLIZA_ANTICIPO":     "Póliza de Anticipo",
    "POLIZA_CALIDAD":      "Póliza de Calidad",
    "GARANTIA_BANCARIA":   "Garantía Bancaria",
    "PAGARE":              "Pagaré",
}


def _poliza_a_dict(poliza: Poliza) -> dict:
    """Convierte un ORM Poliza (creado por PMO) al formato SolicitudResponse."""
    enlace, codigo, centro = extraer_notas_pmo(poliza.notas_internas)
    return {
        "id":                 poliza.id,
        "numero_radicado":    poliza.numero_poliza,
        "codigo_comprobante": codigo or f"REQ-PMO-{poliza.id:06d}",
        "descripcion":        poliza.objeto_contrato or "",
        "tipo_garantia":      poliza.tipo.value if poliza.tipo else "",
        "enlace_nextcloud":   enlace,
        "valor_contrato":     float(poliza.valor_contrato) if poliza.valor_contrato else None,
        "centro_costos":      centro or None,
        "estado":             poliza.estado.value,
        "creado_por":         poliza.modificado_por,
        "created_at":         poliza.created_at.isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════
# GET /solicitudes — Listar todas las solicitudes PMO
# ═══════════════════════════════════════════════════════════════════

@router.get("", status_code=status.HTTP_200_OK)
async def listar_solicitudes(db: DbSession):
    """
    Retorna todas las pólizas creadas por el flujo PMO
    (identificadas por número de radicado con prefijo SOL-).
    Ordenadas de más reciente a más antigua.
    """
    stmt = (
        select(Poliza)
        .where(Poliza.numero_poliza.like("SOL-%"))
        .order_by(Poliza.created_at.desc())
    )
    result = await db.execute(stmt)
    polizas = result.scalars().all()
    return [_poliza_a_dict(p) for p in polizas]


# ═══════════════════════════════════════════════════════════════════
# POST /solicitudes — Crear solicitud PMO
# ═══════════════════════════════════════════════════════════════════

@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_solicitud(
    data: SolicitudCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    Crea una póliza en estado BORRADOR a partir de la solicitud PMO.
    Genera automáticamente:
      - numero_radicado: SOL-{año}-{id:05d}
      - codigo_comprobante: REQ-PMO-XXXXXX  (6 chars aleatorios A-Z0-9)

    El código comprobante se almacena en notas_internas junto al enlace NextCloud.
    """
    hoy = date.today()

    # FK aseguradora_id y contratista_id son NOT NULL → placeholder para BORRADOR
    aseg = (await db.execute(select(Aseguradora).limit(1))).scalar_one_or_none()
    cont = (await db.execute(select(Contratista).limit(1))).scalar_one_or_none()
    if not aseg or not cont:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No hay aseguradoras o contratistas registrados. "
                "Ejecute POST /api/v1/seed/demo primero para cargar datos de demo."
            ),
        )

    tipo = _TIPO_MAP.get(data.tipo_garantia, TipoPoliza.OTRO)

    # Generar el código comprobante ANTES de persistir (se guarda en notas_internas)
    codigo_comprobante = generar_codigo_comprobante()

    # Placeholder único de numero_poliza; se reemplaza con el radicado tras flush
    ts = int(datetime.now(tz=timezone.utc).timestamp())
    poliza = Poliza(
        numero_poliza=f"BOR-{ts}",
        tipo=tipo,
        modalidad=ModalidadGarantia.POLIZA_SEGURO,
        estado=EstadoPoliza.BORRADOR,
        vigencia_desde=hoy,
        vigencia_hasta=hoy + timedelta(days=365),
        valor_asegurado=Decimal("0"),
        valor_contrato=data.valor_contrato or Decimal("0"),
        objeto_contrato=data.descripcion,
        notas_internas=(
            f"[PMO] Enlace NextCloud: {data.enlace_nextcloud}\n"
            f"[COMPROBANTE] {codigo_comprobante}"
            + (f"\n[CENTRO_COSTOS] {data.centro_costos}" if data.centro_costos else "")
        ),
        aseguradora_id=aseg.id,
        contratista_id=cont.id,
        alertas_enviadas=0,
        modificado_por=current_user["email"],
    )
    db.add(poliza)
    await db.flush()  # obtiene el ID sin cerrar transacción

    # Actualizar numero_poliza al formato de radicado definitivo
    numero_radicado = generar_numero_radicado(poliza.id)
    poliza.numero_poliza = numero_radicado

    db.add(ChecklistExpedicion(poliza_id=poliza.id))
    await db.commit()
    await db.refresh(poliza)

    return {
        "id":                 poliza.id,
        "numero_radicado":    numero_radicado,
        "codigo_comprobante": codigo_comprobante,
        "descripcion":        data.descripcion,
        "tipo_garantia":      data.tipo_garantia,
        "tipo_garantia_label": _TIPO_LABEL.get(data.tipo_garantia, data.tipo_garantia),
        "enlace_nextcloud":   data.enlace_nextcloud,
        "valor_contrato":     float(data.valor_contrato) if data.valor_contrato else None,
        "centro_costos":      data.centro_costos or None,
        "estado":             poliza.estado.value,
        "creado_por":         current_user["email"],
        "created_at":         poliza.created_at.isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════
# GET /solicitudes/{id} — Obtener solicitud por ID
# ═══════════════════════════════════════════════════════════════════

@router.get("/{solicitud_id}", status_code=status.HTTP_200_OK)
async def obtener_solicitud(solicitud_id: int, db: DbSession):
    poliza = (await db.execute(
        select(Poliza).where(Poliza.id == solicitud_id)
    )).scalar_one_or_none()

    if poliza is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud con ID {solicitud_id} no encontrada.",
        )

    return _poliza_a_dict(poliza)
