"""
app/services/poliza_service.py
==============================
Capa de lógica de negocio para el recurso Póliza.

Responsabilidades:
  - Ejecutar queries SQLAlchemy (async) con eager loading correcto.
  - Aplicar reglas de negocio que no caben en los schemas Pydantic
    (ej: transiciones de estado, coherencia de fechas con DB).
  - Lanzar HTTPException con códigos y mensajes descriptivos.
  - NO conoce detalles de HTTP (eso es responsabilidad del endpoint).

Patrón usado: Service class con sesión inyectada en el constructor.
El endpoint recibe la sesión via Depends(get_db) y la pasa al servicio.
"""

from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.poliza import EstadoPoliza, Poliza, TipoPoliza
from app.models.checklist import ChecklistExpedicion
from app.models.corredor import Corredor  # noqa: F401 — needed for eager load
from app.schemas.poliza import (
    PolizaCreate,
    PolizaListResponse,
    PolizaResponse,
    PolizaResponseDetalle,
    PolizaUpdate,
)


# ─────────────────────────────────────────────────────────────────────────────
# Transiciones de estado permitidas
# Diagrama: BORRADOR → PENDIENTE_REVISION → ACTIVA → POR_VENCER | VENCIDA
#                                                  → RENOVADA | ANULADA
# ─────────────────────────────────────────────────────────────────────────────
TRANSICIONES_VALIDAS: dict[EstadoPoliza, set[EstadoPoliza]] = {
    EstadoPoliza.BORRADOR:            {EstadoPoliza.PENDIENTE_REVISION, EstadoPoliza.ANULADA},
    EstadoPoliza.PENDIENTE_REVISION:  {EstadoPoliza.ACTIVA, EstadoPoliza.BORRADOR, EstadoPoliza.ANULADA},
    EstadoPoliza.ACTIVA:              {EstadoPoliza.POR_VENCER, EstadoPoliza.VENCIDA,
                                       EstadoPoliza.RENOVADA, EstadoPoliza.ANULADA},
    EstadoPoliza.POR_VENCER:          {EstadoPoliza.ACTIVA, EstadoPoliza.VENCIDA,
                                       EstadoPoliza.RENOVADA, EstadoPoliza.ANULADA},
    EstadoPoliza.VENCIDA:             {EstadoPoliza.RENOVADA, EstadoPoliza.ANULADA},
    EstadoPoliza.RENOVADA:            set(),   # estado terminal
    EstadoPoliza.ANULADA:             set(),   # estado terminal
}


class PolizaService:
    """
    Servicio central para operaciones sobre Pólizas.

    Uso en un endpoint:
        service = PolizaService(db)
        poliza  = await service.get_by_id(poliza_id)
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ──────────────────────────────────────────────────────────────────────────
    # HELPERS PRIVADOS
    # ──────────────────────────────────────────────────────────────────────────

    def _select_con_relaciones(self):
        """
        Select base con todas las relaciones necesarias para PolizaResponseDetalle.
        Usa selectinload (2 queries eficientes) en lugar de joinedload para
        relaciones *-to-many, evitando el problema de filas duplicadas.
        """
        return (
            select(Poliza)
            .options(
                selectinload(Poliza.aseguradora),
                selectinload(Poliza.contratista),
                selectinload(Poliza.corredor),
                selectinload(Poliza.siniestros),
                selectinload(Poliza.checklist),
                selectinload(Poliza.alertas),
            )
        )

    async def _get_poliza_o_404(self, poliza_id: int) -> Poliza:
        """Obtiene una póliza con todas sus relaciones o lanza 404."""
        stmt = self._select_con_relaciones().where(Poliza.id == poliza_id)
        result = await self.db.execute(stmt)
        poliza = result.scalar_one_or_none()
        if poliza is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Póliza con ID {poliza_id} no encontrada.",
            )
        return poliza

    async def _verificar_numero_unico(
        self, numero_poliza: str, excluir_id: int | None = None
    ) -> None:
        """Lanza 409 si el número de póliza ya existe en otra fila."""
        stmt = select(Poliza.id).where(Poliza.numero_poliza == numero_poliza)
        if excluir_id:
            stmt = stmt.where(Poliza.id != excluir_id)
        resultado = await self.db.execute(stmt)
        if resultado.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Ya existe una póliza registrada con el número '{numero_poliza}'. "
                    "Los números de póliza deben ser únicos en el sistema."
                ),
            )

    def _validar_transicion_estado(
        self, estado_actual: EstadoPoliza, estado_nuevo: EstadoPoliza
    ) -> None:
        """Valida que el cambio de estado siga el flujo de negocio permitido."""
        if estado_actual == estado_nuevo:
            return  # No hay cambio, es válido
        permitidos = TRANSICIONES_VALIDAS.get(estado_actual, set())
        if estado_nuevo not in permitidos:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"No es posible cambiar el estado de '{estado_actual.value}' "
                    f"a '{estado_nuevo.value}'. "
                    f"Transiciones permitidas desde '{estado_actual.value}': "
                    f"{[e.value for e in permitidos] or 'ninguna (estado terminal)'}."
                ),
            )

    async def _validar_fechas_vs_db(
        self,
        poliza_existente: Poliza,
        vigencia_desde_nueva: date | None,
        vigencia_hasta_nueva: date | None,
    ) -> None:
        """
        Cuando el PATCH trae solo una de las dos fechas, compara contra
        la que ya está en DB para asegurar coherencia.
        """
        desde_final = vigencia_desde_nueva or poliza_existente.vigencia_desde
        hasta_final  = vigencia_hasta_nueva  or poliza_existente.vigencia_hasta
        if hasta_final <= desde_final:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"La fecha de fin de vigencia ({hasta_final}) "
                    f"debe ser posterior a la fecha de inicio ({desde_final})."
                ),
            )

    # ──────────────────────────────────────────────────────────────────────────
    # CREATE
    # ──────────────────────────────────────────────────────────────────────────

    async def crear(
        self,
        payload: PolizaCreate,
        modificado_por: str | None = None,  # TODO: Integrar con servicio de Auth — recibir current_user["email"]
    ) -> PolizaResponseDetalle:
        """
        Crea una nueva póliza y su checklist de expedición vacío.

        Flujo:
          1. Verificar unicidad del número de póliza.
          2. Crear la póliza con estado BORRADOR.
          3. Crear el ChecklistExpedicion asociado (10 pasos en False).
          4. Commit y retornar con relaciones cargadas.
        """
        await self._verificar_numero_unico(payload.numero_poliza)

        # Validar que la póliza anterior exista y su estado permita la renovación
        # antes de persistir nada, para evitar un rollback costoso.
        poliza_anterior_obj = None
        if payload.poliza_anterior_id:
            poliza_anterior_obj = await self.db.get(Poliza, payload.poliza_anterior_id)
            if poliza_anterior_obj is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"La póliza anterior con ID {payload.poliza_anterior_id} "
                        "no existe en el sistema."
                    ),
                )
            # Valida que la transición ESTADO_ACTUAL → RENOVADA sea válida según
            # el diagrama de flujo definido en TRANSICIONES_VALIDAS.
            self._validar_transicion_estado(
                poliza_anterior_obj.estado, EstadoPoliza.RENOVADA
            )

        dump = payload.model_dump()
        if dump.get("valor_asegurado") is None:
            dump["valor_asegurado"] = Decimal("0")

        poliza = Poliza(
            **dump,
            estado=EstadoPoliza.BORRADOR,
            alertas_enviadas=0,
            modificado_por=modificado_por,
        )
        self.db.add(poliza)
        await self.db.flush()  # Obtiene el ID sin hacer commit aún

        # Crear el checklist vacío asociado automáticamente
        checklist = ChecklistExpedicion(poliza_id=poliza.id)
        self.db.add(checklist)

        # Marcar la póliza anterior como RENOVADA en el mismo commit atómico.
        # Así nunca quedan dos pólizas activas para el mismo contrato.
        if poliza_anterior_obj is not None:
            poliza_anterior_obj.estado = EstadoPoliza.RENOVADA
            poliza_anterior_obj.notas_internas = (
                f"[RENOVADA] Reemplazada por la póliza '{poliza.numero_poliza}' "
                f"(ID {poliza.id}).\n"
                f"Nota anterior: {poliza_anterior_obj.notas_internas or '—'}"
            )
            if modificado_por:
                poliza_anterior_obj.modificado_por = modificado_por

        await self.db.commit()
        await self.db.refresh(poliza)

        # Recargar con relaciones para la respuesta
        return PolizaResponseDetalle.model_validate(
            await self._get_poliza_o_404(poliza.id)
        )

    # ──────────────────────────────────────────────────────────────────────────
    # READ — obtener por ID
    # ──────────────────────────────────────────────────────────────────────────

    async def get_por_id(self, poliza_id: int) -> PolizaResponseDetalle:
        """Retorna una póliza con todas sus relaciones anidadas."""
        poliza = await self._get_poliza_o_404(poliza_id)
        return PolizaResponseDetalle.model_validate(poliza)

    # ──────────────────────────────────────────────────────────────────────────
    # READ — listar con filtros y paginación
    # ──────────────────────────────────────────────────────────────────────────

    async def listar(
        self,
        *,
        pagina: int = 1,
        por_pagina: int = 20,
        # Filtros opcionales
        tipo: TipoPoliza | None = None,
        estado: EstadoPoliza | None = None,
        aseguradora_id: int | None = None,
        contratista_id: int | None = None,
        corredor_id: int | None = None,
        numero_contrato: str | None = None,
        busqueda: str | None = None,       # Busca en numero_poliza y objeto_contrato
        vence_antes_de: date | None = None,
        vence_despues_de: date | None = None,
        solo_por_vencer_dias: int | None = None,  # Pólizas que vencen en X días
    ) -> PolizaListResponse:
        """
        Lista pólizas con paginación y filtros combinables.

        Para el listado usamos un select ligero (sin todas las relaciones)
        para no sobrecargar la DB cuando hay cientos de pólizas.
        Las relaciones completas solo se cargan en get_por_id().
        """
        # ── Query base ────────────────────────────────────────────────────────
        stmt_base = (
            select(Poliza)
            .options(
                selectinload(Poliza.aseguradora),   # Necesario para mostrar nombre
                selectinload(Poliza.contratista),   # Necesario para mostrar nombre
                selectinload(Poliza.siniestros),    # Para contar siniestros en la lista
                selectinload(Poliza.checklist),     # Para mostrar progreso
            )
        )

        # ── Filtros ───────────────────────────────────────────────────────────
        filtros = []

        if tipo:
            filtros.append(Poliza.tipo == tipo)

        if estado:
            filtros.append(Poliza.estado == estado)

        if aseguradora_id:
            filtros.append(Poliza.aseguradora_id == aseguradora_id)

        if contratista_id:
            filtros.append(Poliza.contratista_id == contratista_id)

        if corredor_id:
            filtros.append(Poliza.corredor_id == corredor_id)

        if numero_contrato:
            filtros.append(
                Poliza.numero_contrato.ilike(f"%{numero_contrato}%")
            )

        if vence_antes_de:
            filtros.append(Poliza.vigencia_hasta <= vence_antes_de)

        if vence_despues_de:
            filtros.append(Poliza.vigencia_hasta >= vence_despues_de)

        if solo_por_vencer_dias is not None:
            hoy = date.today()
            limite = date.fromordinal(hoy.toordinal() + solo_por_vencer_dias)
            filtros.append(Poliza.vigencia_hasta >= hoy)
            filtros.append(Poliza.vigencia_hasta <= limite)
            filtros.append(
                Poliza.estado.in_([EstadoPoliza.ACTIVA, EstadoPoliza.POR_VENCER])
            )

        if busqueda:
            termino = f"%{busqueda.strip()}%"
            filtros.append(
                or_(
                    Poliza.numero_poliza.ilike(termino),
                    Poliza.objeto_contrato.ilike(termino),
                    Poliza.numero_contrato.ilike(termino),
                )
            )

        if filtros:
            stmt_base = stmt_base.where(*filtros)

        # ── Contar total (para paginación) ────────────────────────────────────
        stmt_count = select(func.count(Poliza.id))
        if filtros:
            stmt_count = stmt_count.where(*filtros)
        total = (await self.db.execute(stmt_count)).scalar_one()

        # ── Paginación y orden ────────────────────────────────────────────────
        offset = (pagina - 1) * por_pagina
        stmt_paginado = (
            stmt_base
            .order_by(Poliza.vigencia_hasta.asc(), Poliza.id.desc())
            .offset(offset)
            .limit(por_pagina)
        )

        resultado = await self.db.execute(stmt_paginado)
        polizas = resultado.scalars().all()

        return PolizaListResponse(
            total=total,
            pagina=pagina,
            por_pagina=por_pagina,
            items=[PolizaResponse.model_validate(p) for p in polizas],
        )

    # ──────────────────────────────────────────────────────────────────────────
    # UPDATE — actualización parcial (PATCH)
    # ──────────────────────────────────────────────────────────────────────────

    async def actualizar(
        self,
        poliza_id: int,
        payload: PolizaUpdate,
        modificado_por: str | None = None,  # TODO: Integrar con servicio de Auth — recibir current_user["email"]
    ) -> PolizaResponseDetalle:
        """
        Actualiza solo los campos presentes en el payload (PATCH semántico).

        Valida:
          - Unicidad del número de póliza si se cambia.
          - Coherencia de fechas contra los valores actuales en DB.
          - Que la transición de estado sea válida según el flujo.
        """
        poliza = await self._get_poliza_o_404(poliza_id)
        cambios = payload.model_dump(exclude_unset=True)

        if not cambios:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El cuerpo de la solicitud está vacío. Envíe al menos un campo para actualizar.",
            )

        # Validar unicidad si se cambia el número
        if "numero_poliza" in cambios and cambios["numero_poliza"] != poliza.numero_poliza:
            await self._verificar_numero_unico(cambios["numero_poliza"], excluir_id=poliza_id)

        # Validar transición de estado si se envía
        if "estado" in cambios:
            self._validar_transicion_estado(poliza.estado, cambios["estado"])

        # Validar coherencia de fechas contra DB
        if "vigencia_desde" in cambios or "vigencia_hasta" in cambios:
            await self._validar_fechas_vs_db(
                poliza,
                cambios.get("vigencia_desde"),
                cambios.get("vigencia_hasta"),
            )

        # Aplicar cambios al ORM object
        for campo, valor in cambios.items():
            setattr(poliza, campo, valor)

        if modificado_por:
            poliza.modificado_por = modificado_por

        await self.db.commit()

        return PolizaResponseDetalle.model_validate(
            await self._get_poliza_o_404(poliza_id)
        )

    # ──────────────────────────────────────────────────────────────────────────
    # DELETE — eliminación lógica (anulación)
    # ──────────────────────────────────────────────────────────────────────────

    async def anular(
        self,
        poliza_id: int,
        motivo: str,
        modificado_por: str | None = None,  # TODO: Integrar con servicio de Auth — recibir current_user["email"]
    ) -> PolizaResponse:
        """
        Anula una póliza (eliminación lógica, no borra el registro).

        Las pólizas no se eliminan físicamente por razones de auditoría
        y trazabilidad en contratos públicos. Se marcan como ANULADA
        con el motivo registrado en notas_internas.
        """
        poliza = await self._get_poliza_o_404(poliza_id)

        self._validar_transicion_estado(poliza.estado, EstadoPoliza.ANULADA)

        poliza.estado = EstadoPoliza.ANULADA
        poliza.notas_internas = (
            f"[ANULADA] {motivo}\n"
            f"Nota anterior: {poliza.notas_internas or '—'}"
        )
        if modificado_por:
            poliza.modificado_por = modificado_por

        await self.db.commit()
        await self.db.refresh(poliza)

        return PolizaResponse.model_validate(poliza)

    # ──────────────────────────────────────────────────────────────────────────
    # DELETE — eliminación física (hard delete)
    # ──────────────────────────────────────────────────────────────────────────

    async def eliminar_fisicamente(self, poliza_id: int) -> None:
        """
        Borra la póliza y sus dependientes directamente de PostgreSQL.

        La cascada 'all, delete-orphan' definida en el modelo Poliza elimina
        automáticamente: ChecklistExpedicion, Siniestro y AlertaVencimiento.
        Las FK a Aseguradora, Contratista y Corredor solo se referencian
        (ondelete=RESTRICT/SET NULL), por lo que esas tablas no se tocan.
        """
        poliza = await self._get_poliza_o_404(poliza_id)
        await self.db.delete(poliza)
        await self.db.commit()

    # ──────────────────────────────────────────────────────────────────────────
    # HELPERS DE NEGOCIO — usados por el scheduler de alertas
    # ──────────────────────────────────────────────────────────────────────────

    async def obtener_polizas_por_vencer(
        self, dias_umbral: int
    ) -> list[Poliza]:
        """
        Retorna pólizas activas que vencen en exactamente `dias_umbral` días.
        Usado por el scheduler de alertas para disparar notificaciones.
        """
        hoy = date.today()
        fecha_objetivo = date.fromordinal(hoy.toordinal() + dias_umbral)

        stmt = (
            select(Poliza)
            .options(
                selectinload(Poliza.contratista),
                selectinload(Poliza.aseguradora),
            )
            .where(
                Poliza.vigencia_hasta == fecha_objetivo,
                Poliza.estado.in_([EstadoPoliza.ACTIVA, EstadoPoliza.POR_VENCER]),
            )
        )
        resultado = await self.db.execute(stmt)
        return list(resultado.scalars().all())

    async def marcar_vencidas(self) -> int:
        """
        Actualiza a VENCIDA todas las pólizas cuya vigencia_hasta < hoy.
        Llamado por el scheduler diario. Retorna el número de pólizas actualizadas.
        """
        hoy = date.today()
        stmt = (
            select(Poliza)
            .where(
                Poliza.vigencia_hasta < hoy,
                Poliza.estado.in_([EstadoPoliza.ACTIVA, EstadoPoliza.POR_VENCER]),
            )
        )
        resultado = await self.db.execute(stmt)
        polizas_vencidas = resultado.scalars().all()

        for poliza in polizas_vencidas:
            poliza.estado = EstadoPoliza.VENCIDA

        if polizas_vencidas:
            await self.db.commit()

        return len(polizas_vencidas)
