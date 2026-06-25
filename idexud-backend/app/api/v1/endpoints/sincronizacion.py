"""app/api/v1/endpoints/sincronizacion.py — Sincronización y consulta de proyectos SIEXUD."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.proyecto_siexud import ProyectoSiexud
from app.services.integracion_siexud import sincronizar_proyectos_siexud

router = APIRouter(tags=["Sincronización SIEXUD"])


# ---------------------------------------------------------------------------
# POST /sincronizar
# ---------------------------------------------------------------------------
@router.post(
    "/sincronizar",
    summary="Sincronizar proyectos desde SIEXUD",
    status_code=status.HTTP_200_OK,
)
async def sincronizar(db: AsyncSession = Depends(get_db)):
    """
    Descarga todos los proyectos de la API OFEX UD y hace upsert en la BD local.
    Devuelve conteos de creados, actualizados, errores y, si hubo algún fallo,
    el mensaje de la primera excepción para facilitar el diagnóstico.
    """
    try:
        resultado = await sincronizar_proyectos_siexud(db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error inesperado en sincronización: {type(exc).__name__}: {exc}",
        )

    # Si hubo errores pero también éxitos parciales, devolvemos 200 con los detalles.
    # Si TODO falló (0 procesados y hay errores), devolvemos 207 Multi-Status para
    # que el frontend pueda mostrarlo diferente al éxito total.
    if resultado.get("errores", 0) > 0 and resultado.get("creados", 0) == 0 and resultado.get("actualizados", 0) == 0:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=207,
            content={"mensaje": "Sincronización con errores — ningún proyecto insertado", **resultado},
        )

    return {"mensaje": "Sincronización completada", **resultado}


# ---------------------------------------------------------------------------
# GET /proyectos  — listado con filtros y paginación
# ---------------------------------------------------------------------------
@router.get("/proyectos", summary="Listar proyectos SIEXUD locales")
async def listar_proyectos(
    busqueda: Optional[str] = Query(None, description="Busca en nombre, entidad o código contable"),
    anio: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    region_codigo: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(ProyectoSiexud)

    if busqueda:
        term = f"%{busqueda}%"
        q = q.where(
            or_(
                ProyectoSiexud.nombre.ilike(term),
                ProyectoSiexud.entidad_contratante.ilike(term),
                ProyectoSiexud.codigo_contable.ilike(term),
                ProyectoSiexud.numero_externo.ilike(term),
            )
        )
    if anio is not None:
        q = q.where(ProyectoSiexud.anio == anio)
    if estado:
        q = q.where(ProyectoSiexud.estado == estado)
    if region_codigo:
        q = q.where(ProyectoSiexud.region_codigo == region_codigo)
    if activo is not None:
        q = q.where(ProyectoSiexud.activo == activo)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    q = q.order_by(ProyectoSiexud.anio.desc(), ProyectoSiexud.numero_interno.desc())
    q = q.offset((pagina - 1) * por_pagina).limit(por_pagina)

    rows = await db.execute(q)
    proyectos = rows.scalars().all()

    return {
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "paginas_totales": max(1, -(-total // por_pagina)),
        "proyectos": [_serializar(p) for p in proyectos],
    }


# ---------------------------------------------------------------------------
# GET /proyectos/opciones  — lista compacta para el combobox
# ---------------------------------------------------------------------------
@router.get("/proyectos/opciones", summary="Opciones de proyectos para Combobox")
async def opciones_proyectos(
    q: Optional[str] = Query(None, description="Texto de búsqueda"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(
        ProyectoSiexud.numero_interno,
        ProyectoSiexud.nombre,
        ProyectoSiexud.codigo_contable,
        ProyectoSiexud.entidad_contratante,
        ProyectoSiexud.valor_vigente,
        ProyectoSiexud.estado,
        ProyectoSiexud.fecha_fin_vigente,
    ).where(ProyectoSiexud.activo == True)  # noqa: E712

    if q:
        term = f"%{q}%"
        stmt = stmt.where(
            or_(
                ProyectoSiexud.nombre.ilike(term),
                ProyectoSiexud.codigo_contable.ilike(term),
                ProyectoSiexud.entidad_contratante.ilike(term),
            )
        )

    stmt = stmt.order_by(ProyectoSiexud.anio.desc(), ProyectoSiexud.numero_interno.desc()).limit(80)
    rows = await db.execute(stmt)

    return [
        {
            "numero_interno": r.numero_interno,
            "nombre": r.nombre,
            "codigo_contable": r.codigo_contable,
            "entidad_contratante": r.entidad_contratante,
            "valor_vigente": float(r.valor_vigente) if r.valor_vigente else None,
            "estado": r.estado,
            "fecha_fin_vigente": r.fecha_fin_vigente.isoformat() if r.fecha_fin_vigente else None,
        }
        for r in rows
    ]


def _serializar(p: ProyectoSiexud) -> dict:
    return {
        "id": p.id,
        "numero_interno": p.numero_interno,
        "numero_externo": p.numero_externo,
        "anio": p.anio,
        "nombre": p.nombre,
        "objeto": p.objeto,
        "estado": p.estado,
        "tipo_financiacion": p.tipo_financiacion,
        "region_impactada": p.region_impactada,
        "region_codigo": p.region_codigo,
        "entidad_contratante": p.entidad_contratante,
        "dependencia_ejecutora": p.dependencia_ejecutora,
        "supervisor": p.supervisor,
        "correo_principal": p.correo_principal,
        "fecha_suscripcion": p.fecha_suscripcion.isoformat() if p.fecha_suscripcion else None,
        "fecha_inicio": p.fecha_inicio.isoformat() if p.fecha_inicio else None,
        "fecha_fin_original": p.fecha_fin_original.isoformat() if p.fecha_fin_original else None,
        "fecha_fin_vigente": p.fecha_fin_vigente.isoformat() if p.fecha_fin_vigente else None,
        "prorrogado": p.prorrogado,
        "num_prorrogas": p.num_prorrogas,
        "num_modificaciones": p.num_modificaciones,
        "valor_original": float(p.valor_original) if p.valor_original else None,
        "total_adicionado": float(p.total_adicionado) if p.total_adicionado else None,
        "valor_vigente": float(p.valor_vigente) if p.valor_vigente else None,
        "aporte_entidad": float(p.aporte_entidad) if p.aporte_entidad else None,
        "aporte_universidad": float(p.aporte_universidad) if p.aporte_universidad else None,
        "beneficio_institucional": float(p.beneficio_institucional) if p.beneficio_institucional else None,
        "pct_beneficio": p.pct_beneficio,
        "acto_administrativo": p.acto_administrativo,
        "enlace_secop": p.enlace_secop,
        "codigo_contable": p.codigo_contable,
        "activo": p.activo,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
