#!/usr/bin/env python
"""
seed_datos_reales.py
Limpia la tabla polizas e importa los registros reales del reporte IDEXUD (Jun 2026).

Uso (desde la raíz del backend, con el .env cargado):
    cd idexud-backend
    python seed_datos_reales.py

Notas de diseño:
  - vigencia_desde/hasta: placeholder 2026-01-01 / 2026-12-31 cuando falta en el reporte.
  - valor_asegurado: 0.00 cuando no figura en el reporte.
  - Ambos casos se anotan con ⚠ en notas_internas para que los usuarios los actualicen.
  - Aseguradora no encontrada → usa "POR IDENTIFICAR" (creada si no existe).
  - Entidad no encontrada como contratista → se crea con NIT provisional.
  - Corredor no encontrado → corredor_id queda NULL.
"""

import os
import sys
import re
from datetime import date
from decimal import Decimal, InvalidOperation

import psycopg2
from psycopg2.extras import RealDictCursor

# ---------------------------------------------------------------------------
# Conexión
# ---------------------------------------------------------------------------
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
DB_NAME = os.getenv("POSTGRES_DB", "idexud_polizas")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")

# ---------------------------------------------------------------------------
# Datos del reporte  (row = número original del listado)
# ---------------------------------------------------------------------------
POLIZAS_RAW = [
    {
        "row": 1,
        "contrato": "CONTRATO FINANCIAMIENTO DE RECUPERACION 0475-2022",
        "entidad": "ICETEX",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "17 - 101046285",
        "anexo": "6",
        "amparo": "CUMPLIMIENTO",
        "valor": "370.944,00",
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": "VISION INTEGRAL",
        "observaciones": "ANEXOS ANTERIORES EN CARPETA",
    },
    {
        "row": 2,
        "contrato": "CONVENIO INTERADMINISTRATIVO 277 DE 2019",
        "entidad": "MINISTERIO DE EDUCACION NACIONAL",
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": "NB-100445852",
        "anexo": "0",
        "amparo": "CUMPLIMIENTO",
        "valor": "2.435.215,00",
        "cdp": "1056", "op": "3934", "fecha_pago": "07/05/2026", "expedicion": None,
        "intermediario": "VISION INTEGRAL",
        "observaciones": "Se anuló anterior póliza con Seguros del Estado y se tiene ahora con Seguros Mundial. CDP CARGADO A LA BASE.",
    },
    {
        "row": 3,
        "contrato": "CONTRATO FINANCIAMIENTO DE RECUPERACION 0475-2022",
        "entidad": "ICETEX",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "17 - 101046285",
        "anexo": "8",
        "amparo": "CUMPLIMIENTO",
        "valor": "42.840,00",
        "cdp": "1061", "op": "4044", "fecha_pago": "12/05/2026", "expedicion": None,
        "intermediario": "VISION INTEGRAL",
        "observaciones": "CDP CARGADO A LA CARPETA",
    },
    {
        "row": 4,
        "contrato": "C-INTERAD-273-2025",
        "entidad": "INSTITUTO MUNICIPAL DE CULTURA, RECREACION Y DEPORTE DE ZIPAQUIRA",
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": None,
        "anexo": "2",
        "amparo": "CUMPLIMIENTO Y RCE",
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": "VISION INTEGRAL",
        "observaciones": "Es una modificación, pero la pagó el proyecto.",
    },
    {
        "row": 5,
        "contrato": "CONTRATO INTERADMINISTRATIVO NºCD-CINT-170-2025",
        "entidad": "MUNICIPIO DE JUNIN CUNDINAMARCA",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-44-101256097",
        "anexo": "2",
        "amparo": "CUMPLIMIENTO",
        "valor": "329.245,00",
        "cdp": "1033", "op": "1549", "fecha_pago": None, "expedicion": None,
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": "ok",
    },
    {
        "row": 6,
        "contrato": "CONTRATO INTERADMINISTRATIVO NºCD-CINT-170-2025",
        "entidad": "MUNICIPIO DE JUNIN CUNDINAMARCA",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-44-101256097",
        "anexo": "3",
        "amparo": None,
        "valor": "14.280,00",
        "cdp": "1033", "op": "3871", "fecha_pago": "05/05/2026", "expedicion": None,
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": None,
    },
    {
        "row": 7,
        "contrato": "CONTRATO INERADMINISTRATIVO 1138-2024",
        "entidad": "MINISTERIO DE SALUD Y PROTECCION SOCIAL",
        "aseguradora_buscar": "BOLIVAR",
        "numero_poliza": "1505003552801",
        "anexo": "3",
        "amparo": "CUMPLIMIENTO",
        "valor": "8.479,00",
        "cdp": "1034", "op": "3932", "fecha_pago": "06/05/2026", "expedicion": "04/05/2026",
        "intermediario": "MCALLISTER E HIJOS ASOCIADOS LTDA",
        "observaciones": None,
    },
    {
        "row": 8,
        "contrato": "CONVENIO INTERADMINISTRATIVO N° 713-2023",
        "entidad": "MINISTERIO DE LAS TECNOLOGIAS DE LA INFORMACION Y LAS COMUNICACIONES",
        "aseguradora_buscar": "SOLIDARIA",
        "numero_poliza": "980-47-994000024976",
        "anexo": None,
        "amparo": "CUMPLIMIENTO",
        "valor": "1.175.439,00",
        "cdp": "1059", "op": None, "fecha_pago": "15/05/2026", "expedicion": None,
        "intermediario": "ARREZOLA SEGUROS LTDA",
        "observaciones": "CDP CARGADO A LA CARPETA",
    },
    {
        "row": 9,
        "contrato": "CONTRATO INTERADMINISTRATIVO No. FDLBOSA CD 919-2025",
        "entidad": "FONDO DE DESARROLLO LOCAL DE BOSA",
        "aseguradora_buscar": None,
        "numero_poliza": None,
        "anexo": None,
        "amparo": None,
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 10,
        "contrato": "Contrato Interadministrativo 050.3.021.027.052.2026 de 2026",
        "entidad": "UNIVERSIDAD DEL VALLE",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-45-101182031",
        "anexo": "3 y 4",
        "amparo": None,
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": "El proyecto realizó el pago",
    },
    {
        "row": 11,
        "contrato": "CT INT 136 DE 2025 SUPERSALUD",
        "entidad": None,
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-44-101258722",
        "anexo": "1",
        "amparo": None,
        "valor": "54.852,00",
        "cdp": "1075", "op": "4116", "fecha_pago": "15/05/2026", "expedicion": "14/05/2026",
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 12,
        "contrato": "CI 1694",
        "entidad": "ALCALDIA DE CIUDAD BOLIVAR",
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": None,
        "anexo": None,
        "amparo": None,
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 13,
        "contrato": "Contrato 1134 de 2024",
        "entidad": "FONDO DE DESARROLLO LOCAL DE KENNEDY",
        "aseguradora_buscar": "SOLIDARIA",
        "numero_poliza": "310-47-99400002979-3",
        "anexo": "3",
        "amparo": "CUMPLIMIENTO",
        "valor": "645.632,00",
        "cdp": None, "op": "2922", "fecha_pago": "14/04/2026", "expedicion": "10/04/2026",
        "intermediario": "LHM SEGUROS LTDA",
        "observaciones": None,
    },
    {
        "row": 14,
        "contrato": "FONDO DE DESARROLLO LOCAL DE BOSA",
        "entidad": "FONDO DE DESARROLLO LOCAL DE BOSA",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-44-101269895",
        "anexo": "4",
        "amparo": None,
        "valor": "600.623,00",
        "cdp": "441", "op": "4829", "fecha_pago": "27/05/2026", "expedicion": "08/05/2026",
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 15,
        "contrato": "CF RC.2022-0475 ICETEX",
        "entidad": "ICETEX",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "17-45-101046285",
        "anexo": "6",
        "amparo": None,
        "valor": "370.944,00",
        "cdp": "1068", "op": "4823", "fecha_pago": "27/05/2026", "expedicion": "28/04/2026",
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 16,
        "contrato": "Servicios de seguros generales de responsabilidad civil",
        "entidad": None,
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": "NB-100448164",
        "anexo": "0",
        "amparo": None,
        "valor": "142.243,00",
        "cdp": "1004", "op": "4824", "fecha_pago": "27/05/2026", "expedicion": "25/05/2026",
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 17,
        "contrato": "1156",
        "entidad": "KENNEDY",
        "aseguradora_buscar": None,
        "numero_poliza": None,
        "anexo": None,
        "amparo": None,
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 18,
        "contrato": "DILOF 06-5-10329-2024",
        "entidad": "DILOF 06-5-10329-2024",
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": "NB-100363300",
        "anexo": "7",
        "amparo": None,
        "valor": "187.682,00",
        "cdp": "1137", "op": "4113", "fecha_pago": "15/05/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 19,
        "contrato": "CI 791-2023 MINCIENCIAS",
        "entidad": "MINISTERIO DE CIENCIAS",
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": "100280454",
        "anexo": "4",
        "amparo": None,
        "valor": "1.022.803,00",
        "cdp": "1054", "op": "4115", "fecha_pago": "19/05/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 20,
        "contrato": "CONTRATO INTERADMINISTRATIVO NO. PN DILOF NO. 06-5-10237-25",
        "entidad": None,
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-40-101081179",
        "anexo": "2",
        "amparo": None,
        "valor": "5.950,00",
        "cdp": "1144", "op": "4194", "fecha_pago": "21/05/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 21,
        "contrato": "CONTRATO INTERADMINISTRATIVO NO. PN DILOF NO. 06-5-10237-25",
        "entidad": None,
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-40-101081179",
        "anexo": "3",
        "amparo": None,
        "valor": "260.448,00",
        "cdp": "1144", "op": "4194", "fecha_pago": "21/05/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 22,
        "contrato": "CONTRATO INTERADMINISTRATIVO NO. PN DILOF NO. 06-5-10237-25",
        "entidad": None,
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-44-101261204",
        "anexo": "5",
        "amparo": None,
        "valor": "134.862,00",
        "cdp": "1144", "op": "4194", "fecha_pago": "21/05/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 23,
        "contrato": "CONVENIO 352-2025 MINIGUALDAD",
        "entidad": "MINISTERIO DE IGUALDAD",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "101177396",
        "anexo": "4",
        "amparo": None,
        "valor": "4.922.776,00",
        "cdp": "328", "op": "2838", "fecha_pago": "08/04/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 24,
        "contrato": "CONVENIO 352-2025 MINIGUALDAD",
        "entidad": "MINISTERIO DE IGUALDAD",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "101177396",
        "anexo": "8",
        "amparo": None,
        "valor": "2.070.870,00",
        "cdp": "328", "op": "2838", "fecha_pago": "08/04/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 25,
        "contrato": "CONVENIO 352-2025 MINIGUALDAD",
        "entidad": "MINISTERIO DE IGUALDAD",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "101085408",
        "anexo": "2",
        "amparo": None,
        "valor": "90.731,00",
        "cdp": "328", "op": "2838", "fecha_pago": "08/04/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 26,
        "contrato": "SERIEDAD DE LA OFERTA",
        "entidad": None,
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": None,
        "anexo": None,
        "amparo": "SERIEDAD DE LA OFERTA",
        "valor": "648.471,00",
        "cdp": "930", "op": "2841", "fecha_pago": "09/04/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 27,
        "contrato": "CDC-CAM-001-2026",
        "entidad": "CONTRALORIA DE CUNDINAMARCA",
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": "100448164",
        "anexo": "0",
        "amparo": "SERIEDAD DE LA OFERTA",
        "valor": "142.243,00",
        "cdp": "1004", "op": None, "fecha_pago": None, "expedicion": "10/06/2026",
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": "CARGADO EN NEXTCLOUD - ENVIADO A PMO",
    },
    {
        "row": 28,
        "contrato": "CONV FDLSC-CVNI-716-2025",
        "entidad": None,
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": "100402229",
        "anexo": "3",
        "amparo": None,
        "valor": "1.943.577,00",
        "cdp": "152", "op": "3590", "fecha_pago": "22/04/2026", "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    # Nota: el ítem 29 no figura en el reporte original.
    {
        "row": 30,
        "contrato": "CONTRATO 136 DE 2025",
        "entidad": "SUPERSALUD",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-44-101258722",
        "anexo": "2",
        "amparo": "CUMPLIMIENTO",
        "valor": "22.210,00",
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": "12/06/2026",
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": "CARGADO EN NEXTCLOUD - ENVIADO A CARGUE Y AL PROYECTO",
    },
    {
        "row": 31,
        "contrato": "CONTRATO INTERADMINISTRATIVO 1135",
        "entidad": "FONDO DE DESARROLLO LOCAL DE KENNEDY",
        "aseguradora_buscar": "BOLIVAR",
        "numero_poliza": "p 1505003707201",
        "anexo": "6",
        "amparo": "CUMPLIMIENTO",
        "valor": "45.617,00",
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": "16/06/2026",
        "intermediario": "MCALLISTER E HIJOS ASOCIADOS LTDA",
        "observaciones": "CARGADO EN NEXTCLOUD - ENVIADO A CARGUE Y AL PROYECTO",
    },
    {
        "row": 32,
        "contrato": "PLIEGO PROCESO 70007859",
        "entidad": "Distrito Especial de Ciencia, Tecnologia e Innovacion de Medellin",
        "aseguradora_buscar": None,
        "numero_poliza": None,
        "anexo": None,
        "amparo": "SERIEDAD DE LA OFERTA",
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 33,
        "contrato": "contrato 523-2024",
        "entidad": "PERSONERIA DE BOGOTA",
        "aseguradora_buscar": "BOLIVAR",
        "numero_poliza": "p 1505003492401",
        "anexo": None,
        "amparo": "CUMPLIMIENTO",
        "valor": "74.739,00",
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": "17/06/2026",
        "intermediario": "MCALLISTER E HIJOS ASOCIADOS LTDA",
        "observaciones": "No enviaron CDP - Se solicita CDP al proyecto",
    },
    {
        "row": 34,
        "contrato": "PROCESO CM-04-2026",
        "entidad": "CONSEJO SUPERIOR DE LA JUDICATURA",
        "aseguradora_buscar": "MUNDIAL",
        "numero_poliza": "100450902",
        "anexo": "0",
        "amparo": "SERIEDAD DE LA OFERTA",
        "valor": "76.586,00",
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": "10/06/2026",
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": "CARGADO EN NEXTCLOUD - ENVIADO A PMO",
    },
    {
        "row": 35,
        "contrato": "CONTRATO INTERADMINISTRATIVO 1134",
        "entidad": "FONDO DE DESARROLLO LOCAL DE KENNEDY",
        "aseguradora_buscar": "SOLIDARIA",
        "numero_poliza": "310-47-994000012979",
        "anexo": "4",
        "amparo": "CUMPLIMIENTO",
        "valor": "246.575,00",
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": "18/06/2026",
        "intermediario": "LHM SEGUROS LTDA",
        "observaciones": "CARGADO EN NEXTCLOUD - ENVIADO A FIRMA",
    },
    {
        "row": 36,
        "contrato": "CIA 589",
        "entidad": "ANH",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-40-101081763",
        "anexo": "3",
        "amparo": "RCE",
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 37,
        "contrato": "CIA 589",
        "entidad": "ANH",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-40-101081763",
        "anexo": "4",
        "amparo": "RCE",
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": "05/06/2026",
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 38,
        "contrato": "(Sin Contrato)",
        "entidad": "ANH",
        "aseguradora_buscar": "ESTADO",
        "numero_poliza": "11-44-101262416",
        "anexo": "3",
        "amparo": "CUMPLIMIENTO",
        "valor": None,
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": None,
        "intermediario": None,
        "observaciones": None,
    },
    {
        "row": 39,
        "contrato": "CIA 1160",
        "entidad": "FONDO DE DESARROLLO LOCAL DE KENNEDY",
        "aseguradora_buscar": "BOLIVAR",
        "numero_poliza": "p 1505003712601",
        "anexo": "2",
        "amparo": "CUMPLIMIENTO",
        "valor": "25.461,00",
        "cdp": None, "op": None, "fecha_pago": None, "expedicion": "19/06/2026",
        "intermediario": "MCALLISTER E HIJOS ASOCIADOS LTDA",
        "observaciones": "No han enviado CDP.",
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
TIPO_MAP = {
    "CUMPLIMIENTO": "CUMPLIMIENTO",
    "RCE": "RCE",
    "CUMPLIMIENTO Y RCE": "OTRO",
    "RESPONSABILIDAD CIVIL": "RESPONSABILIDAD_CIVIL",
    "SERIEDAD DE LA OFERTA": "OTRO",
    "CALIDAD SERVICIO": "CALIDAD_SERVICIO",
    "PAGO SALARIOS": "PAGO_SALARIOS",
    "ESTABILIDAD OBRA": "ESTABILIDAD_OBRA",
    "CORRECTO MANEJO": "CORRECTO_MANEJO",
}


def map_tipo(amparo):
    if not amparo:
        return "OTRO"
    return TIPO_MAP.get(amparo.strip().upper(), "OTRO")


def parse_valor_co(s):
    """Convierte '370.944,00' → Decimal('370944.00')."""
    if not s:
        return Decimal("0.00")
    s = re.sub(r"[$ ]", "", s.strip())
    s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return Decimal("0.00")


def parse_fecha_co(s):
    """Convierte '07/05/2026' → date(2026, 5, 7). Retorna None si falla."""
    if not s:
        return None
    try:
        d, m, y = s.strip().split("/")
        return date(int(y), int(m), int(d))
    except Exception:
        return None


def build_numero_poliza(row):
    """Genera un numero_poliza único para la BD."""
    nro = row.get("numero_poliza")
    anexo = row.get("anexo")
    if nro:
        base = nro.strip()
        if anexo:
            return f"{base}-A{anexo.strip()}"
        return base
    # Sin número de póliza: usar referencia del contrato
    contrato = (row.get("contrato") or "").strip()[:40]
    r = row["row"]
    if contrato:
        clean = re.sub(r"[^A-Z0-9-]", "-", contrato.upper())[:30]
        return f"PENDIENTE-{clean}-{r}"
    return f"PENDIENTE-{r}"


def build_notas(row, flags):
    """Construye el texto de notas_internas concatenando todos los campos relevantes."""
    partes = []
    if row.get("entidad"):
        partes.append(f"Entidad: {row['entidad']}")
    if row.get("cdp"):
        partes.append(f"CDP: {row['cdp']}")
    if row.get("op") and not row.get("op"):  # OP va en orden_pago_numero; solo se repite si hay algún contexto
        pass
    if row.get("observaciones"):
        partes.append(f"Observaciones: {row['observaciones']}")
    if flags:
        partes.append("⚠ PENDIENTE ACTUALIZAR: " + ", ".join(flags))
    return " | ".join(partes) if partes else None


# ---------------------------------------------------------------------------
# Lógica principal
# ---------------------------------------------------------------------------
def main():
    print("=" * 65)
    print(" SEED DATOS REALES - IDEXUD Polizas (Jun 2026)")
    print("=" * 65)

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS,
    )
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # ----------------------------------------------------------------
        # 1. Limpieza — borrar sólo polizas (cascade borra alertas/siniestros/checklist)
        # ----------------------------------------------------------------
        print("\n[1/4] Eliminando polizas existentes (y sus alertas/siniestros/checklists)...")
        cur.execute("DELETE FROM polizas")
        borradas = cur.rowcount
        print(f"      {borradas} registro(s) eliminado(s).")

        # ----------------------------------------------------------------
        # 2. Buscar / crear aseguradora "POR IDENTIFICAR" (placeholder)
        # ----------------------------------------------------------------
        cur.execute("SELECT id FROM aseguradoras WHERE nombre ILIKE '%POR IDENTIFICAR%'")
        row_placeholder = cur.fetchone()
        if row_placeholder:
            aseg_placeholder_id = row_placeholder["id"]
        else:
            cur.execute(
                "INSERT INTO aseguradoras (nombre, nit, activa) VALUES (%s, %s, %s) RETURNING id",
                ("POR IDENTIFICAR", "000000000-0", True),
            )
            aseg_placeholder_id = cur.fetchone()["id"]
            print("      Aseguradora POR IDENTIFICAR creada (placeholder).")

        # ----------------------------------------------------------------
        # 3. Iterar e insertar registros
        # ----------------------------------------------------------------
        print("\n[2/4] Procesando e insertando polizas...\n")

        ok = 0
        advertencias = []
        nit_counter = 9000  # base para NITs provisionales de entidades nuevas

        for row in POLIZAS_RAW:
            r = row["row"]

            # --- Número de póliza único ---
            numero_poliza = build_numero_poliza(row)

            # --- Aseguradora ---
            aseg_id = None
            buscar = row.get("aseguradora_buscar")
            if buscar:
                cur.execute(
                    "SELECT id FROM aseguradoras WHERE nombre ILIKE %s LIMIT 1",
                    (f"%{buscar}%",),
                )
                found = cur.fetchone()
                aseg_id = found["id"] if found else None
                if not found:
                    advertencias.append(f"[{r}] Aseguradora '{buscar}' no encontrada => usando placeholder.")
                    aseg_id = aseg_placeholder_id
            else:
                advertencias.append(f"[{r}] Sin aseguradora en el reporte => usando placeholder.")
                aseg_id = aseg_placeholder_id

            # --- Contratista (Entidad) ---
            entidad = (row.get("entidad") or "").strip().upper() or "SIN ENTIDAD"
            cur.execute(
                "SELECT id FROM contratistas WHERE nombre_razon_social ILIKE %s LIMIT 1",
                (f"%{entidad[:30]}%",),
            )
            found_ct = cur.fetchone()
            if found_ct:
                contratista_id = found_ct["id"]
            else:
                nit_counter += 1
                nit_provisional = f"GEN-{nit_counter}"
                cur.execute(
                    """INSERT INTO contratistas
                       (tipo, nombre_razon_social, numero_identificacion, activo, notas)
                       VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                    ("PERSONA_JURIDICA", entidad[:300], nit_provisional, True,
                     "Creado automáticamente desde seed — NIT provisional pendiente de actualizar"),
                )
                contratista_id = cur.fetchone()["id"]
                advertencias.append(f"[{r}] Contratista creado con NIT provisional {nit_provisional}.")

            # --- Corredor ---
            corredor_id = None
            intermediario = row.get("intermediario")
            if intermediario:
                token = intermediario.strip().split()[0]  # primera palabra como clave de búsqueda
                cur.execute(
                    "SELECT id FROM corredores WHERE empresa ILIKE %s LIMIT 1",
                    (f"%{token}%",),
                )
                found_cor = cur.fetchone()
                if found_cor:
                    corredor_id = found_cor["id"]
                else:
                    advertencias.append(f"[{r}] Corredor '{intermediario}' no encontrado => corredor_id=NULL.")

            # --- Tipo / Amparo ---
            tipo = map_tipo(row.get("amparo"))

            # --- Valor asegurado ---
            valor_asegurado = parse_valor_co(row.get("valor"))
            flags = []
            if valor_asegurado == Decimal("0.00"):
                flags.append("VALOR_ASEGURADO")

            # --- Vigencia (placeholder si no hay datos) ---
            vigencia_desde = date(2026, 1, 1)
            vigencia_hasta = date(2026, 12, 31)
            flags.append("VIGENCIA")  # siempre pendiente — no viene en el reporte

            # --- Fechas específicas ---
            fecha_radicacion = parse_fecha_co(row.get("expedicion"))
            orden_pago_fecha = parse_fecha_co(row.get("fecha_pago"))

            # --- Orden de pago ---
            orden_pago_numero = row.get("op")

            # --- Notas internas ---
            notas_internas = build_notas(row, flags)

            # --- Número de contrato ---
            numero_contrato = (row.get("contrato") or "").strip()[:100] or None

            # --- Inserción ---
            cur.execute(
                """
                INSERT INTO polizas (
                    numero_poliza, tipo, modalidad, estado,
                    vigencia_desde, vigencia_hasta,
                    valor_asegurado,
                    numero_contrato,
                    numero_adicion,
                    aseguradora_id, contratista_id, corredor_id,
                    fecha_radicacion,
                    orden_pago_numero, orden_pago_fecha,
                    notas_internas,
                    requiere_acta_inicio, alertas_enviadas
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s,
                    %s,
                    %s,
                    %s,
                    %s, %s, %s,
                    %s,
                    %s, %s,
                    %s,
                    %s, %s
                )
                """,
                (
                    numero_poliza, tipo, "POLIZA_SEGURO", "BORRADOR",
                    vigencia_desde, vigencia_hasta,
                    float(valor_asegurado),
                    numero_contrato,
                    row.get("anexo"),
                    aseg_id, contratista_id, corredor_id,
                    fecha_radicacion,
                    orden_pago_numero, orden_pago_fecha,
                    notas_internas,
                    False, 0,
                ),
            )
            print(f"  OK [{r:02d}] {numero_poliza}")
            ok += 1

        # ----------------------------------------------------------------
        # 4. Commit
        # ----------------------------------------------------------------
        conn.commit()
        print(f"\n[3/4] Commit realizado - {ok} poliza(s) insertada(s).")

        # ----------------------------------------------------------------
        # 5. Resumen
        # ----------------------------------------------------------------
        print("\n[4/4] Resumen de advertencias (aseguradoras/corredores no encontrados):")
        if advertencias:
            for a in advertencias:
                print(f"  WARN: {a}")
        else:
            print("  (ninguna)")

        print("\n" + "=" * 65)
        print(f" IMPORTACION COMPLETA: {ok}/{len(POLIZAS_RAW)} polizas importadas.")
        print(" Proximos pasos:")
        print("   - Actualizar vigencia_desde / vigencia_hasta en cada poliza.")
        print("   - Completar valor_asegurado donde quedo en 0.00.")
        print("   - Asignar NITs reales a los contratistas provisionales.")
        print("=" * 65)

    except Exception as exc:
        conn.rollback()
        print(f"\nERROR - rollback ejecutado.\n{exc}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
