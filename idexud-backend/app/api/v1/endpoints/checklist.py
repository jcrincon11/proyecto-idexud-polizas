"""
app/api/v1/endpoints/checklist.py
===================================
Endpoint para gestionar el checklist de expedición de una póliza.

  PATCH /polizas/{poliza_id}/checklist
      → Actualiza uno o varios pasos del checklist.
      → Registra automáticamente la fecha/hora cuando un paso pasa de False → True.
      → Retorna el checklist actualizado completo.

  GET /polizas/{poliza_id}/checklist
      → Retorna el estado actual del checklist.
"""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.checklist import ChecklistExpedicion
from app.models.poliza import Poliza
from app.schemas.checklist import ChecklistResponse, PolizaChecklistUpdate

router = APIRouter(tags=["Checklist de Expedición"])
DbSession = Annotated[AsyncSession, Depends(get_db)]

# Campos que tienen un campo _fecha paralelo — se marcan automáticamente
CAMPOS_CON_FECHA = {
    "paso1_solicitud_recibida":    "paso1_fecha",
    "paso2_docs_verificados":      "paso2_fecha",
    "paso3_borrador_revisado":     "paso3_fecha",
    "paso4_aprobada_juridica":     "paso4_fecha",
    "paso5_emitida_aseguradora":   "paso5_fecha",
    "paso6_radicada_idexud":       "paso6_fecha",
    "paso7_ingresada_sistema":     "paso7_fecha",
    "paso8_supervisor_notificado": "paso8_fecha",
    "paso9_incluida_cartera":      "paso9_fecha",
    "paso10_archivada":            "paso10_fecha",
}


async def _get_checklist_o_404(poliza_id: int, db: AsyncSession) -> ChecklistExpedicion:
    """Obtiene el checklist de una póliza o lanza 404."""
    # Verificar que la póliza existe
    poliza = (await db.execute(
        select(Poliza).where(Poliza.id == poliza_id)
    )).scalar_one_or_none()
    if poliza is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Póliza con ID {poliza_id} no encontrada.",
        )

    checklist = (await db.execute(
        select(ChecklistExpedicion).where(ChecklistExpedicion.poliza_id == poliza_id)
    )).scalar_one_or_none()

    if checklist is None:
        # Crear si no existe (defensive — normalmente se crea al crear la póliza)
        checklist = ChecklistExpedicion(poliza_id=poliza_id)
        db.add(checklist)
        await db.flush()

    return checklist


@router.get(
    "/polizas/{poliza_id}/checklist",
    response_model=ChecklistResponse,
    summary="Obtener checklist de expedición",
)
async def obtener_checklist(poliza_id: int, db: DbSession) -> ChecklistResponse:
    checklist = await _get_checklist_o_404(poliza_id, db)
    return ChecklistResponse.model_validate(checklist)


@router.patch(
    "/polizas/{poliza_id}/checklist",
    response_model=ChecklistResponse,
    summary="Actualizar pasos del checklist",
    description=(
        "Actualiza uno o varios pasos del checklist de expedición. "
        "Cuando un paso pasa de False → True, se registra automáticamente "
        "la fecha y hora de completitud (hora de Bogotá)."
    ),
)
async def actualizar_checklist(
    poliza_id: int,
    payload:   PolizaChecklistUpdate,
    db:        DbSession,
) -> ChecklistResponse:
    checklist = await _get_checklist_o_404(poliza_id, db)
    ahora     = datetime.now(tz=timezone.utc)

    cambios = payload.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El body está vacío. Envíe al menos un campo para actualizar.",
        )

    for campo, valor in cambios.items():
        valor_actual = getattr(checklist, campo, None)
        setattr(checklist, campo, valor)

        # Auto-timestamp: si un boolean pasa False→True, fijar la _fecha
        if (
            campo in CAMPOS_CON_FECHA
            and isinstance(valor, bool)
            and valor is True
            and not valor_actual   # solo si antes era False/None
        ):
            campo_fecha = CAMPOS_CON_FECHA[campo]
            setattr(checklist, campo_fecha, ahora)

        # Si se desmarca (True→False), limpiar la fecha
        if (
            campo in CAMPOS_CON_FECHA
            and isinstance(valor, bool)
            and valor is False
            and valor_actual is True
        ):
            campo_fecha = CAMPOS_CON_FECHA[campo]
            setattr(checklist, campo_fecha, None)

    await db.commit()
    await db.refresh(checklist)
    return ChecklistResponse.model_validate(checklist)
