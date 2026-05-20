"""
solicitud_service.py — Validación Contextual y Lógica de Negocio
=================================================================
Aquí vive TODO el "qué es obligatorio según el estado".
Los endpoints de FastAPI son finos y delegan aquí.

Ejemplo de uso en un router:
    @router.patch("/{id}", response_model=PeticionReadConPermisos)
    def actualizar(id: int, data: PeticionUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
        return PolizaService.actualizar(db, id, data, current_user)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import (
    ChecklistItem, EstadoPoliza, HistorialEstado,
    Poliza, RolUsuario, Usuario,
    TRANSICIONES_VALIDAS, get_campos_editables,
)
from schemas import (
    PeticionCreate, PeticionReadConPermisos, PeticionUpdate,
    TransicionRequest, TransicionResponse,
)


# ─────────────────────────────────────────────────────────────────
# REGLAS DE CAMPOS OBLIGATORIOS POR ESTADO
#
# Estructura: { estado_destino: [campos_requeridos_antes_de_transicionar] }
#
# Se evalúan justo antes de permitir una transición.
# También se usan en PATCH para advertir al cliente de campos
# que serán necesarios pronto (warnings, no errores).
# ─────────────────────────────────────────────────────────────────

CAMPOS_REQUERIDOS_PARA_ESTADO: dict[str, list[str]] = {
    # Para poder pasar a análisis jurídico, centro_de_costos debe estar lleno
    EstadoPoliza.JURIDICA_ANALISIS: ["centro_de_costos"],

    # Para poder marcar como emitida, la aseguradora debe estar registrada
    EstadoPoliza.EMITIDA: ["aseguradora", "fecha_inicio_vigencia", "fecha_fin_vigencia"],

    # Para pagar, debe existir el número de póliza real y el valor de prima
    EstadoPoliza.PAGADA: ["numero_poliza", "valor_prima"],

    # Para reintegrar, debe existir el valor
    EstadoPoliza.REINTEGRADA: ["valor_reintegro"],
}


# ─────────────────────────────────────────────────────────────────
# RESULTADO DE VALIDACIÓN (devuelto al endpoint para mensajes claros)
# ─────────────────────────────────────────────────────────────────

@dataclass
class ResultadoValidacion:
    valido:          bool
    errores:         list[str] = field(default_factory=list)
    advertencias:    list[str] = field(default_factory=list)   # Campos que harán falta pronto
    campos_denegados: list[str] = field(default_factory=list)  # Por permisos de rol


# ─────────────────────────────────────────────────────────────────
# FUNCIÓN CENTRAL: validar_campos_por_estado
# ─────────────────────────────────────────────────────────────────

def validar_campos_por_estado(
    poliza: Poliza,
    campos_a_escribir: dict[str, Any],
    rol: RolUsuario,
    estado_destino: EstadoPoliza | None = None,
) -> ResultadoValidacion:
    """
    Validación contextual completa. Verifica tres cosas:

    1. PERMISOS DE ROL: ¿puede este rol editar estos campos en el estado actual?
    2. CAMPOS BLOQUEADOS: ¿algún campo está vedado globalmente en el estado actual?
    3. CAMPOS REQUERIDOS (solo si estado_destino está presente):
       ¿la póliza tiene todo lo necesario para transicionar?

    Args:
        poliza:           Instancia ORM de la póliza actual.
        campos_a_escribir: Dict con los campos que el cliente quiere actualizar.
        rol:              Rol del usuario autenticado.
        estado_destino:   Si se está validando antes de una transición,
                          incluir el estado al que se quiere llegar.

    Returns:
        ResultadoValidacion con errores y advertencias detallados.
    """
    resultado = ResultadoValidacion(valido=True)

    editables = get_campos_editables(poliza.estado, rol)
    es_admin = editables == ["*"]

    # ── 1. Verificar permisos de rol ──────────────────────────────
    if not es_admin:
        for campo in campos_a_escribir:
            if campo not in editables:
                resultado.campos_denegados.append(campo)

        if resultado.campos_denegados:
            resultado.valido = False
            resultado.errores.append(
                f"El rol '{rol.value}' no puede editar los siguientes campos "
                f"en estado '{poliza.estado.value}': {resultado.campos_denegados}. "
                f"Campos permitidos: {editables}"
            )

    # ── 2. Verificar campos globalmente bloqueados ─────────────────
    SIEMPRE_BLOQUEADOS_HASTA: dict[str, list[str]] = {
        "valor_reintegro": [
            EstadoPoliza.BORRADOR, EstadoPoliza.SOLICITUD_PMO,
            EstadoPoliza.JURIDICA_ANALISIS, EstadoPoliza.EMITIDA,
        ],
        "centro_de_costos": [
            EstadoPoliza.BORRADOR, EstadoPoliza.SOLICITUD_PMO,
        ],
    }
    for campo_bloqueado, estados_bloqueados in SIEMPRE_BLOQUEADOS_HASTA.items():
        if campo_bloqueado in campos_a_escribir and poliza.estado in estados_bloqueados:
            resultado.valido = False
            resultado.errores.append(
                f"'{campo_bloqueado}' no está disponible en estado "
                f"'{poliza.estado.value}'. Se habilita en: "
                f"{_primer_estado_habilitado(campo_bloqueado, estados_bloqueados)}"
            )

    # ── 3. Verificar campos requeridos para la transición ──────────
    if estado_destino:
        requeridos = CAMPOS_REQUERIDOS_PARA_ESTADO.get(estado_destino, [])
        for campo in requeridos:
            valor_actual = getattr(poliza, campo, None)
            valor_en_update = campos_a_escribir.get(campo)
            if not valor_actual and not valor_en_update:
                resultado.valido = False
                resultado.errores.append(
                    f"'{campo}' es obligatorio para transicionar a "
                    f"'{estado_destino.value}' y no tiene valor."
                )

    # ── 4. Advertencias: campos que harán falta en el siguiente estado ─
    siguiente_estados = TRANSICIONES_VALIDAS.get(poliza.estado, [])
    if siguiente_estados:
        siguiente = siguiente_estados[0]  # El primer paso "feliz"
        pronto_requeridos = CAMPOS_REQUERIDOS_PARA_ESTADO.get(siguiente, [])
        for campo in pronto_requeridos:
            if not getattr(poliza, campo, None) and campo not in campos_a_escribir:
                resultado.advertencias.append(
                    f"'{campo}' será obligatorio cuando pases a '{siguiente.value}'"
                )

    return resultado


def _primer_estado_habilitado(campo: str, estados_bloqueados: list[str]) -> str:
    """Helper: retorna el nombre del estado donde el campo se habilita."""
    todos = list(EstadoPoliza)
    for estado in todos:
        if estado not in estados_bloqueados:
            return estado.value
    return "estado posterior"


# ─────────────────────────────────────────────────────────────────
# SERVICE LAYER — PolizaService
# ─────────────────────────────────────────────────────────────────

class PolizaService:

    # ── Crear ─────────────────────────────────────────────────────

    @staticmethod
    def crear(
        db: Session,
        data: PeticionCreate,
        usuario: Usuario,
    ) -> PeticionReadConPermisos:
        poliza = Poliza(
            descripcion=data.descripcion,
            tipo_garantia=data.tipo_garantia,
            enlace_nextcloud=data.enlace_nextcloud,
            monto_asegurado=data.monto_asegurado,
            solicitante_id=usuario.id,
            estado=EstadoPoliza.BORRADOR,
        )
        db.add(poliza)
        db.flush()

        db.add(HistorialEstado(
            poliza_id=poliza.id,
            estado_anterior=None,
            estado_nuevo=EstadoPoliza.BORRADOR,
            usuario_id=usuario.id,
            comentario="Póliza creada",
        ))
        db.commit()
        db.refresh(poliza)
        return PeticionReadConPermisos.para_rol(poliza, usuario.rol)

    # ── Actualizar (PATCH) ────────────────────────────────────────

    @staticmethod
    def actualizar(
        db: Session,
        poliza_id: int,
        data: PeticionUpdate,
        usuario: Usuario,
    ) -> PeticionReadConPermisos:
        poliza = _get_or_404(db, poliza_id)
        campos = data.campos_enviados()

        if not campos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El body no contiene campos para actualizar.",
            )

        resultado = validar_campos_por_estado(poliza, campos, usuario.rol)

        if not resultado.valido:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "errores":          resultado.errores,
                    "campos_denegados": resultado.campos_denegados,
                },
            )

        for campo, valor in campos.items():
            setattr(poliza, campo, valor)

        db.commit()
        db.refresh(poliza)

        respuesta = PeticionReadConPermisos.para_rol(poliza, usuario.rol)

        # Inyectar advertencias en el header (FastAPI las pondrá en la respuesta)
        # En el router: response.headers["X-Warnings"] = json.dumps(advertencias)
        respuesta.__dict__["_advertencias"] = resultado.advertencias

        return respuesta

    # ── Transicionar estado ───────────────────────────────────────

    @staticmethod
    def transicionar(
        db: Session,
        poliza_id: int,
        request: TransicionRequest,
        usuario: Usuario,
    ) -> TransicionResponse:
        poliza = _get_or_404(db, poliza_id)
        nuevo_estado = request.nuevo_estado

        # Validar campos requeridos para la transición
        resultado = validar_campos_por_estado(
            poliza=poliza,
            campos_a_escribir={},      # No se escribe nada, solo se valida
            rol=usuario.rol,
            estado_destino=nuevo_estado,
        )
        if not resultado.valido:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "mensaje": f"No se puede transicionar a '{nuevo_estado.value}'",
                    "errores": resultado.errores,
                },
            )

        estado_anterior = poliza.estado

        try:
            historial = poliza.transicionar(nuevo_estado, usuario.id, request.comentario)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        db.add(historial)
        db.commit()

        campos_ahora = get_campos_editables(nuevo_estado, usuario.rol)
        campos_antes = get_campos_editables(estado_anterior, usuario.rol)

        return TransicionResponse(
            poliza_id=poliza_id,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            campos_ahora_editables=campos_ahora if campos_ahora != ["*"] else ["todos"],
            campos_ahora_bloqueados=[
                c for c in campos_antes if c not in campos_ahora and campos_ahora != ["*"]
            ],
            mensaje=f"Póliza pasó de '{estado_anterior.value}' a '{nuevo_estado.value}'.",
        )

    # ── Leer ──────────────────────────────────────────────────────

    @staticmethod
    def obtener(
        db: Session,
        poliza_id: int,
        usuario: Usuario,
    ) -> PeticionReadConPermisos:
        poliza = _get_or_404(db, poliza_id)
        return PeticionReadConPermisos.para_rol(poliza, usuario.rol)


# ─────────────────────────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, poliza_id: int) -> Poliza:
    poliza = db.get(Poliza, poliza_id)
    if not poliza:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Póliza {poliza_id} no encontrada.",
        )
    return poliza
