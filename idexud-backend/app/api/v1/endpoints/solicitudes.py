"""
app/api/v1/endpoints/solicitudes.py
=====================================
Flujo PMO — crea una póliza en estado BORRADOR con los datos mínimos.

Endpoints:
  POST /solicitudes       → PMO crea solicitud inicial
  GET  /solicitudes/{id}  → Consultar una solicitud por ID
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.aseguradora import Aseguradora
from app.models.checklist import ChecklistExpedicion
from app.models.contratista import Contratista
from app.models.poliza import EstadoPoliza, ModalidadGarantia, Poliza, TipoPoliza
from app.schemas.solicitud import SolicitudCreate, generar_numero_radicado

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


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_solicitud(data: SolicitudCreate, db: DbSession):
    """
    Crea una póliza en estado BORRADOR a partir de la solicitud PMO.

    Los campos que PMO no conoce aún (aseguradora, contratista, número de póliza
    definitivo) se completan con valores temporales; el área jurídica los actualiza
    en los pasos siguientes del flujo.
    """
    hoy = date.today()

    # Las FK aseguradora_id y contratista_id son NOT NULL en el modelo.
    # Usamos el primer registro disponible como placeholder para BORRADOR.
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

    # numero_poliza requiere ser único; ponemos un placeholder con timestamp
    # que se reemplazará justo abajo con el radicado basado en el id asignado.
    ts = int(datetime.now(tz=timezone.utc).timestamp())
    poliza = Poliza(
        numero_poliza=f"BOR-{ts}",
        tipo=tipo,
        modalidad=ModalidadGarantia.POLIZA_SEGURO,
        estado=EstadoPoliza.BORRADOR,
        vigencia_desde=hoy,
        vigencia_hasta=hoy + timedelta(days=365),
        valor_asegurado=data.monto_asegurado or Decimal("0"),
        objeto_contrato=data.descripcion,
        notas_internas=f"[PMO] Enlace NextCloud: {data.enlace_nextcloud}",
        aseguradora_id=aseg.id,
        contratista_id=cont.id,
        alertas_enviadas=0,
    )
    db.add(poliza)
    # flush para que la DB asigne el id sin cerrar la transacción
    await db.flush()

    # Ahora que tenemos el id, actualizamos numero_poliza al formato de radicado
    numero_radicado = generar_numero_radicado(poliza.id)
    poliza.numero_poliza = numero_radicado

    # Crear el checklist de expedición asociado (igual que en seed.py)
    db.add(ChecklistExpedicion(poliza_id=poliza.id))

    await db.commit()
    await db.refresh(poliza)

    # Devolvemos un dict en lugar de serializar el ORM directamente porque
    # SolicitudResponse espera campos (descripcion, tipo_garantia, enlace_nextcloud)
    # que no existen como columnas en el modelo Poliza.
    return {
        "id":               poliza.id,
        "numero_radicado":  numero_radicado,
        "descripcion":      data.descripcion,
        "tipo_garantia":    data.tipo_garantia,
        "enlace_nextcloud": data.enlace_nextcloud,
        "monto_asegurado":  float(data.monto_asegurado) if data.monto_asegurado else None,
        "estado":           poliza.estado.value,
        "created_at":       poliza.created_at.isoformat(),
    }


@router.get("/{solicitud_id}")
async def obtener_solicitud(solicitud_id: int, db: DbSession):
    poliza = (await db.execute(
        select(Poliza).where(Poliza.id == solicitud_id)
    )).scalar_one_or_none()

    if poliza is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud con ID {solicitud_id} no encontrada.",
        )

    return {
        "id":               poliza.id,
        "numero_radicado":  poliza.numero_poliza,
        "descripcion":      poliza.objeto_contrato or "",
        "tipo_garantia":    poliza.tipo.value if poliza.tipo else "",
        "enlace_nextcloud": poliza.notas_internas or "",
        "monto_asegurado":  float(poliza.valor_asegurado) if poliza.valor_asegurado else None,
        "estado":           poliza.estado.value,
        "created_at":       poliza.created_at.isoformat(),
    }
