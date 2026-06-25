"""
Servicio de integración con la API SIEXUD (OFEX UD).
Consume el endpoint público de proyectos y sincroniza con la tabla proyectos_siexud.
"""
import logging
from datetime import date
from decimal import Decimal
from typing import Any

import httpx
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.proyecto_siexud import ProyectoSiexud

logger = logging.getLogger("idexud.siexud")

SIEXUD_BASE_URL = "https://ofex.udistrital.edu.co/project_management_api/proyectos"
MAX_PAGINAS = 30  # límite de seguridad (>21 páginas actuales)


def _parse_date(valor: Any) -> date | None:
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor))
    except (ValueError, TypeError):
        return None


def _parse_decimal(valor: Any) -> Decimal | None:
    if valor is None:
        return None
    try:
        return Decimal(str(valor))
    except Exception:
        return None


def _mapear_proyecto(raw: dict) -> dict:
    """Convierte un dict crudo de la API al dict de campos del modelo."""
    return {
        "numero_interno": int(raw["numero_interno"]),
        "numero_externo": raw.get("numero_externo"),
        "anio": raw.get("año"),
        "nombre": (raw.get("nombre") or "")[:2000],
        "objeto": raw.get("objeto"),
        "estado": raw.get("estado"),
        "tipo_financiacion": raw.get("tipo_financiacion"),
        "region_impactada": raw.get("region_impactada"),
        "region_codigo": raw.get("region_codigo"),
        "entidad_contratante": raw.get("entidad_contratante"),
        "dependencia_ejecutora": raw.get("dependencia_ejecutora"),
        "supervisor": raw.get("supervisor"),
        "correo_principal": raw.get("correo_principal"),
        "fecha_suscripcion": _parse_date(raw.get("fecha_suscripcion")),
        "fecha_inicio": _parse_date(raw.get("fecha_inicio")),
        "fecha_fin_original": _parse_date(raw.get("fecha_fin_original")),
        "fecha_fin_vigente": _parse_date(raw.get("fecha_fin_vigente")),
        "prorrogado": bool(raw.get("prorrogado", False)),
        "num_prorrogas": int(raw.get("num_prorrogas") or 0),
        "num_modificaciones": int(raw.get("num_modificaciones") or 0),
        "valor_original": _parse_decimal(raw.get("valor_original")),
        "total_adicionado": _parse_decimal(raw.get("total_adicionado")),
        "valor_vigente": _parse_decimal(raw.get("valor_vigente")),
        "aporte_entidad": _parse_decimal(raw.get("aporte_entidad")),
        "aporte_universidad": _parse_decimal(raw.get("aporte_universidad")),
        "beneficio_institucional": _parse_decimal(raw.get("beneficio_institucional")),
        "pct_beneficio": raw.get("pct_beneficio"),
        "acto_administrativo": raw.get("acto_administrativo"),
        "enlace_secop": raw.get("enlace_secop"),
        "codigo_contable": raw.get("codigo_contable"),
        "activo": bool(raw.get("activo", True)),
    }


async def sincronizar_proyectos_siexud(db: AsyncSession) -> dict:
    """
    Descarga todos los proyectos del SIEXUD paginando y hace upsert en la BD.

    Usa INSERT ... ON CONFLICT DO UPDATE para evitar problemas de estado de
    sesión (PendingRollback) que ocurren con el patrón SELECT + add/setattr
    cuando autoflush=False está activo.

    Retorna resumen con totales de procesados y errores.
    """
    procesados = 0
    errores = 0
    primera_excepcion: str | None = None
    pagina = 1

    # Conteo inicial para calcular creados vs actualizados al final
    total_antes_result = await db.execute(select(func.count()).select_from(ProyectoSiexud))
    total_antes = total_antes_result.scalar_one()

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        while pagina <= MAX_PAGINAS:
            # ── Obtener página de la API ──────────────────────────────────
            try:
                resp = await client.get(SIEXUD_BASE_URL, params={"pagina": pagina})
                resp.raise_for_status()
                payload = resp.json()
            except httpx.HTTPError as exc:
                logger.error("Error HTTP al obtener página %d: %s", pagina, exc)
                if primera_excepcion is None:
                    primera_excepcion = f"HTTP error página {pagina}: {exc}"
                errores += 1
                break

            logger.info(
                "Página %d — claves respuesta: %s",
                pagina,
                list(payload.keys()) if isinstance(payload, dict) else type(payload).__name__,
            )

            proyectos_raw = payload.get("proyectos") or []
            if not proyectos_raw:
                logger.info("Página %d vacía — sincronización completa.", pagina)
                break

            # ── Mapear proyectos de esta página ───────────────────────────
            page_campos: list[dict] = []
            for raw in proyectos_raw:
                try:
                    page_campos.append(_mapear_proyecto(raw))
                except Exception as exc:
                    logger.warning(
                        "Error mapeando numero_interno=%s: %s",
                        raw.get("numero_interno"),
                        exc,
                    )
                    errores += 1
                    if primera_excepcion is None:
                        primera_excepcion = f"Mapeo fallido (interno={raw.get('numero_interno')}): {exc}"

            if not page_campos:
                pagina += 1
                continue

            # ── Upsert en bloque: INSERT ... ON CONFLICT DO UPDATE ────────
            # Una sola sentencia SQL por página, completamente atómica.
            # Evita el problema de PendingRollback que ocurría con el patrón
            # SELECT + session.add() cuando autoflush=False.
            try:
                stmt = pg_insert(ProyectoSiexud).values(page_campos)
                update_cols = {
                    col: stmt.excluded[col]
                    for col in page_campos[0]
                    if col != "numero_interno"
                }
                upsert_stmt = stmt.on_conflict_do_update(
                    index_elements=["numero_interno"],
                    set_=update_cols,
                )
                await db.execute(upsert_stmt)
                await db.commit()
                procesados += len(page_campos)
                logger.info(
                    "Página %d: %d registros upserted. Total procesados: %d",
                    pagina,
                    len(page_campos),
                    procesados,
                )
            except Exception as exc:
                await db.rollback()
                logger.error("Error en upsert página %d: %s", pagina, exc)
                errores += len(page_campos)
                if primera_excepcion is None:
                    primera_excepcion = f"Upsert fallido página {pagina}: {exc}"
                # Continuar con la siguiente página en lugar de abortar todo
                pagina += 1
                continue

            paginas_totales = payload.get("paginas_totales", 0)
            if pagina >= paginas_totales:
                break
            pagina += 1

    # Calcular creados vs actualizados comparando conteo antes/después
    total_despues_result = await db.execute(select(func.count()).select_from(ProyectoSiexud))
    total_despues = total_despues_result.scalar_one()
    creados = total_despues - total_antes
    actualizados = procesados - creados

    resultado = {
        "creados": creados,
        "actualizados": actualizados,
        "errores": errores,
        "paginas_procesadas": pagina,
    }
    if primera_excepcion:
        resultado["primera_excepcion"] = primera_excepcion

    logger.info("Sincronización completa: %s", resultado)
    return resultado
