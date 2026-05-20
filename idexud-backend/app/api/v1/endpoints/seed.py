"""
app/api/v1/endpoints/seed.py
==============================
Endpoint de siembra de datos demo. Solo disponible en development.
POST /api/v1/seed/demo  →  Crea aseguradoras, contratistas y pólizas de muestra.

⚠️  NUNCA exponer en producción. El router lo incluye solo si ENVIRONMENT=development.
"""
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db
from app.core.config import settings
from app.models.aseguradora import Aseguradora
from app.models.contratista import Contratista, TipoContratista
from app.models.poliza import EstadoCartera, EstadoPoliza, ModalidadGarantia, Poliza, TipoPoliza
from app.models.checklist import ChecklistExpedicion

router = APIRouter(prefix="/seed", tags=["Demo / Seed"])

HOY = date.today()


# ── Datos maestros de muestra ─────────────────────────────────────────────────

ASEGURADORAS_DEMO = [
    {"nombre": "Seguros Bolívar S.A.",    "nit": "860002104-8",
     "contacto_email": "polizas@segurosbolivar.com",    "contacto_telefono": "601 3430000"},
    {"nombre": "Liberty Seguros S.A.",    "nit": "800059856-1",
     "contacto_email": "soporte@libertycolombia.com",   "contacto_telefono": "601 6487000"},
    {"nombre": "Sura Seguros S.A.",       "nit": "800088702-1",
     "contacto_email": "empresas@sura.com",             "contacto_telefono": "601 7446000"},
    {"nombre": "Mapfre Seguros S.A.",     "nit": "900049861-1",
     "contacto_email": "mapfre@mapfrecolombia.com",     "contacto_telefono": "601 7456000"},
    {"nombre": "Previsora S.A. de Seguros","nit": "860006975-4",
     "contacto_email": "info@previsora.gov.co",         "contacto_telefono": "601 3388800"},
]

CONTRATISTAS_DEMO = [
    {"nombre_razon_social": "Tech Solutions Colombia S.A.S",
     "numero_identificacion": "901234567-1", "tipo": TipoContratista.PERSONA_JURIDICA,
     "email": "contratos@techsolutions.co", "telefono": "3001234567"},
    {"nombre_razon_social": "Constructora Andes Ltda.",
     "numero_identificacion": "800112233-5", "tipo": TipoContratista.PERSONA_JURIDICA,
     "email": "licitaciones@constructoraandes.com", "telefono": "3109876543"},
    {"nombre_razon_social": "Grupo Innova S.A.S.",
     "numero_identificacion": "900887766-2", "tipo": TipoContratista.PERSONA_JURIDICA,
     "email": "gerencia@grupoinnova.co", "telefono": "3152345678"},
    {"nombre_razon_social": "Carlos Eduardo Rodríguez Mora",
     "numero_identificacion": "79445512",   "tipo": TipoContratista.PERSONA_NATURAL,
     "email": "crodriguez@gmail.com", "telefono": "3204567890"},
    {"nombre_razon_social": "Soluciones TI Bogotá S.A.S",
     "numero_identificacion": "901556677-3", "tipo": TipoContratista.PERSONA_JURIDICA,
     "email": "comercial@solutionsti.co", "telefono": "3173456789"},
    {"nombre_razon_social": "Consultoría & Gestión Ltda.",
     "numero_identificacion": "800998877-0", "tipo": TipoContratista.PERSONA_JURIDICA,
     "email": "proyectos@cgestion.com", "telefono": "3187654321"},
]


def _polizas_demo(aseg_ids: list[int], cont_ids: list[int]) -> list[dict]:
    """Genera pólizas con diferentes estados y umbrales de vencimiento."""
    return [
        # 1. Activa — vence en 45 días | cartera: pendiente reintegro
        dict(numero_poliza="CU-2024-00134", tipo=TipoPoliza.CUMPLIMIENTO,
             vigencia_desde=HOY - timedelta(days=320), vigencia_hasta=HOY + timedelta(days=45),
             valor_asegurado=Decimal("15000000"), valor_prima=Decimal("450000"),
             porcentaje_cobertura=Decimal("10"), valor_contrato=Decimal("150000000"),
             numero_contrato="IDEXUD-2024-0042",
             objeto_contrato="Prestación de servicios de desarrollo de software",
             estado=EstadoPoliza.ACTIVA, aseguradora_id=aseg_ids[0], contratista_id=cont_ids[0],
             centro_costo_solicitante="CC-310 · Rectoría",
             centro_costo_pagador="CC-001 · IDEXUD",
             estado_cartera=EstadoCartera.PENDIENTE_REINTEGRO),
        # 2. Por vencer — 5 días | cartera: abonado
        dict(numero_poliza="RCE-2024-088", tipo=TipoPoliza.RCE,
             vigencia_desde=HOY - timedelta(days=360), vigencia_hasta=HOY + timedelta(days=5),
             valor_asegurado=Decimal("80000000"), valor_prima=Decimal("960000"),
             numero_contrato="IDEXUD-2024-0018",
             objeto_contrato="Construcción de laboratorio de informática",
             estado=EstadoPoliza.POR_VENCER, aseguradora_id=aseg_ids[1], contratista_id=cont_ids[1],
             centro_costo_solicitante="CC-420 · Facultad de Ingeniería",
             centro_costo_pagador="CC-001 · IDEXUD",
             estado_cartera=EstadoCartera.ABONADO,
             orden_pago_numero="OP-2024-0531",
             orden_pago_fecha=HOY - timedelta(days=30)),
        # 3. Vencida — venció hace 4 días | cartera: pagado
        dict(numero_poliza="CU-2023-018", tipo=TipoPoliza.CUMPLIMIENTO,
             vigencia_desde=HOY - timedelta(days=369), vigencia_hasta=HOY - timedelta(days=4),
             valor_asegurado=Decimal("45000000"), valor_prima=Decimal("675000"),
             porcentaje_cobertura=Decimal("10"), valor_contrato=Decimal("450000000"),
             numero_contrato="IDEXUD-2023-0090",
             estado=EstadoPoliza.VENCIDA, aseguradora_id=aseg_ids[2], contratista_id=cont_ids[2],
             centro_costo_solicitante="CC-215 · Ciencias y Educación",
             centro_costo_pagador="CC-001 · IDEXUD",
             estado_cartera=EstadoCartera.PAGADO,
             orden_pago_numero="OP-2023-1102",
             orden_pago_fecha=HOY - timedelta(days=200)),
        # 4. Activa — vence en 240 días | cartera: pendiente reintegro
        dict(numero_poliza="PS-2024-077", tipo=TipoPoliza.PAGO_SALARIOS,
             vigencia_desde=HOY - timedelta(days=125), vigencia_hasta=HOY + timedelta(days=240),
             valor_asegurado=Decimal("12500000"),
             numero_contrato="IDEXUD-2024-0055",
             objeto_contrato="Consultoría en transformación digital",
             estado=EstadoPoliza.ACTIVA, aseguradora_id=aseg_ids[3], contratista_id=cont_ids[4],
             centro_costo_solicitante="CC-512 · Tecnológica",
             centro_costo_pagador="CC-001 · IDEXUD",
             estado_cartera=EstadoCartera.PENDIENTE_REINTEGRO),
        # 5. Borrador — recién creada | sin cartera aún
        dict(numero_poliza="CU-2025-001", tipo=TipoPoliza.CUMPLIMIENTO,
             vigencia_desde=HOY, vigencia_hasta=HOY + timedelta(days=365),
             valor_asegurado=Decimal("25000000"), valor_prima=Decimal("750000"),
             porcentaje_cobertura=Decimal("10"), valor_contrato=Decimal("250000000"),
             numero_contrato="IDEXUD-2025-0001",
             estado=EstadoPoliza.BORRADOR, aseguradora_id=aseg_ids[0], contratista_id=cont_ids[5]),
        # 6. Activa — RCE vigente 10 días | cartera: abonado
        dict(numero_poliza="RCE-2024-112", tipo=TipoPoliza.RCE,
             vigencia_desde=HOY - timedelta(days=355), vigencia_hasta=HOY + timedelta(days=10),
             valor_asegurado=Decimal("200000000"), valor_prima=Decimal("2400000"),
             numero_contrato="IDEXUD-2024-0031",
             objeto_contrato="Obra civil — remodelación aulas bloque C",
             estado=EstadoPoliza.POR_VENCER, aseguradora_id=aseg_ids[4], contratista_id=cont_ids[1],
             centro_costo_solicitante="CC-318 · Medio Ambiente",
             centro_costo_pagador="CC-001 · IDEXUD",
             estado_cartera=EstadoCartera.ABONADO,
             orden_pago_numero="OP-2024-0219",
             orden_pago_fecha=HOY - timedelta(days=15)),
        # 7. Activa — Estabilidad Obra | cartera: pagado
        dict(numero_poliza="EO-2023-044", tipo=TipoPoliza.ESTABILIDAD_OBRA,
             vigencia_desde=HOY - timedelta(days=400), vigencia_hasta=HOY + timedelta(days=1825),
             valor_asegurado=Decimal("350000000"),
             numero_contrato="IDEXUD-2023-0055",
             objeto_contrato="Construcción y adecuación edificio administrativo",
             estado=EstadoPoliza.ACTIVA, aseguradora_id=aseg_ids[1], contratista_id=cont_ids[1],
             centro_costo_solicitante="CC-601 · Artes ASAB",
             centro_costo_pagador="CC-001 · IDEXUD",
             estado_cartera=EstadoCartera.PAGADO,
             orden_pago_numero="OP-2023-0887",
             orden_pago_fecha=HOY - timedelta(days=380)),
        # 8. Activa — Pago salarios | cartera: pendiente reintegro
        dict(numero_poliza="PS-2024-033", tipo=TipoPoliza.PAGO_SALARIOS,
             vigencia_desde=HOY - timedelta(days=200), vigencia_hasta=HOY + timedelta(days=165),
             valor_asegurado=Decimal("8000000"),
             numero_contrato="IDEXUD-2024-0022",
             estado=EstadoPoliza.ACTIVA, aseguradora_id=aseg_ids[2], contratista_id=cont_ids[3],
             centro_costo_solicitante="CC-113 · Ingeniería",
             centro_costo_pagador="CC-001 · IDEXUD",
             estado_cartera=EstadoCartera.PENDIENTE_REINTEGRO),
        # 9. Pendiente revisión | sin datos de cartera aún
        dict(numero_poliza="CU-2025-002", tipo=TipoPoliza.CUMPLIMIENTO,
             vigencia_desde=HOY - timedelta(days=5), vigencia_hasta=HOY + timedelta(days=360),
             valor_asegurado=Decimal("18000000"), valor_prima=Decimal("540000"),
             numero_contrato="IDEXUD-2025-0003",
             estado=EstadoPoliza.PENDIENTE_REVISION, aseguradora_id=aseg_ids[3], contratista_id=cont_ids[0]),
        # 10. Renovada | cartera: pagado
        dict(numero_poliza="CU-2023-099-R", tipo=TipoPoliza.CUMPLIMIENTO,
             vigencia_desde=HOY - timedelta(days=730), vigencia_hasta=HOY - timedelta(days=366),
             valor_asegurado=Decimal("20000000"),
             numero_contrato="IDEXUD-2023-0012",
             estado=EstadoPoliza.RENOVADA, aseguradora_id=aseg_ids[0], contratista_id=cont_ids[2],
             centro_costo_solicitante="CC-410 · Sistemas",
             centro_costo_pagador="CC-001 · IDEXUD",
             estado_cartera=EstadoCartera.PAGADO,
             orden_pago_numero="OP-2022-0445",
             orden_pago_fecha=HOY - timedelta(days=700)),
    ]


@router.post(
    "/demo",
    summary="Sembrar datos de demo",
    description=(
        "Crea aseguradoras, contratistas y pólizas de muestra para la demo. "
        "**Solo disponible en ENVIRONMENT=development.** "
        "Idempotente: no duplica registros si ya existen."
    ),
)
async def seed_demo(db: AsyncSession = Depends(get_db)):
    if not settings.is_development:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El endpoint de seed solo está disponible en entorno de desarrollo.",
        )

    resumen = {"aseguradoras": 0, "contratistas": 0, "polizas": 0, "skipped": 0}

    # ── 1. Aseguradoras ───────────────────────────────────────────────────────
    aseg_ids = []
    for datos in ASEGURADORAS_DEMO:
        existe = (await db.execute(
            select(Aseguradora).where(Aseguradora.nit == datos["nit"])
        )).scalar_one_or_none()

        if existe:
            aseg_ids.append(existe.id)
            resumen["skipped"] += 1
        else:
            a = Aseguradora(**datos)
            db.add(a)
            await db.flush()
            aseg_ids.append(a.id)
            resumen["aseguradoras"] += 1

    # ── 2. Contratistas ───────────────────────────────────────────────────────
    cont_ids = []
    for datos in CONTRATISTAS_DEMO:
        existe = (await db.execute(
            select(Contratista).where(
                Contratista.numero_identificacion == datos["numero_identificacion"]
            )
        )).scalar_one_or_none()

        if existe:
            cont_ids.append(existe.id)
            resumen["skipped"] += 1
        else:
            c = Contratista(**datos)
            db.add(c)
            await db.flush()
            cont_ids.append(c.id)
            resumen["contratistas"] += 1

    # ── 3. Pólizas ────────────────────────────────────────────────────────────
    for datos in _polizas_demo(aseg_ids, cont_ids):
        existe = (await db.execute(
            select(Poliza).where(Poliza.numero_poliza == datos["numero_poliza"])
        )).scalar_one_or_none()

        if existe:
            resumen["skipped"] += 1
            continue

        poliza = Poliza(**datos, alertas_enviadas=0)
        db.add(poliza)
        await db.flush()
        db.add(ChecklistExpedicion(poliza_id=poliza.id))
        resumen["polizas"] += 1

    await db.commit()

    return {
        "status": "ok",
        "mensaje": (
            f"Seed completado. Creados: {resumen['aseguradoras']} aseguradoras, "
            f"{resumen['contratistas']} contratistas, {resumen['polizas']} pólizas. "
            f"Omitidos (ya existían): {resumen['skipped']}."
        ),
        "detalle": resumen,
    }
