"""
scripts/importar_polizas_reales.py
====================================
Carga las 17 pólizas reales de la hoja de gestión de IDEXUD a la BD.

Uso:
    cd idexud-backend
    python -m scripts.importar_polizas_reales

El script es IDEMPOTENTE: si un numero_poliza ya existe en la BD lo omite.
Se crean automáticamente los registros de Aseguradora, Contratista y Corredor
que no existan aún.

Notas sobre los datos fuente:
  - La columna "Valor" es la PRIMA pagada, no el valor asegurado.
    valor_asegurado se fija igual a valor_prima como placeholder; actualizar
    con el valor real de cobertura una vez esté disponible.
  - Filas sin número de póliza reciben un código provisional IMPORT-{no}.
  - Polizas con número duplicado (anexos distintos) se distinguen con sufijo
    -ANEX{no_anexo}.
"""

import asyncio
import hashlib
import logging
import re
import sys
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal, init_db
from app.models.aseguradora import Aseguradora
from app.models.checklist import ChecklistExpedicion
from app.models.contratista import Contratista, TipoContratista
from app.models.corredor import Corredor
from app.models.poliza import EstadoCartera, EstadoPoliza, ModalidadGarantia, Poliza, TipoPoliza

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-7s | %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("importar_polizas")

# ---------------------------------------------------------------------------
# Datos fuente (hoja de cálculo IDEXUD)
# ---------------------------------------------------------------------------

HOY = date.today()

POLIZAS_RAW: list[dict] = [
    {
        "no": 1,
        "contrato": "CONTRATO FINANCIAMIENTO DE RECUPERACION 0475-2022",
        "entidad": "INSTITUTO COLOMBIANO DE CREDITO EDUCATIVO Y ESTUDIOS TECNICOS EN EL EXTERIOR MARIANO OSPINA PEREZ ICETEX",
        "amparo": "CUMPLIMIENTO",
        "no_anexo": "6",
        "compania": "SEGUROS DEL ESTADO S.A.",
        "valor": "$370.944,00",
        "numero_poliza": "17 - 101046285",
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "VISION INTEGRAL",
        "observaciones": "ANEXOS ANTERIORES EN CARPETA",
        "cdp": "",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 2,
        "contrato": "CONVENIO INTERADMINISTRATIVO 277 DE 2019",
        "entidad": "MINISTERIO DE EDUCACION NACIONAL",
        "amparo": "CUMPLIMIENTO",
        "no_anexo": "0",
        "compania": "SEGUROS MUNDIAL",
        "valor": "$2.435.215,00",
        "numero_poliza": "NB-100445852",
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "VISION INTEGRAL",
        "observaciones": "Se anulo anterior poliza con Seguros del Estado; nueva con Seguros Mundial. CDP CARGADO A LA BASE.",
        "cdp": "1056",
        "op": "3934",
        "fecha_pago": "05/05/2026",
    },
    {
        "no": 3,
        "contrato": "CONTRATO FINANCIAMIENTO DE RECUPERACION 0475-2022",
        "entidad": "INSTITUTO COLOMBIANO DE CREDITO EDUCATIVO Y ESTUDIOS TECNICOS EN EL EXTERIOR MARIANO OSPINA PEREZ ICETEX",
        "amparo": "CUMPLIMIENTO",
        "no_anexo": "8",
        "compania": "SEGUROS DEL ESTADO S.A.",
        "valor": "$42.840,00",
        "numero_poliza": "17 - 101046285",  # duplicado de fila 1 — se sufijará
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "VISION INTEGRAL",
        "observaciones": "CDP CARGADO A LA CARPETA",
        "cdp": "1061",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 4,
        "contrato": "C-INTERAD-273-2025",
        "entidad": "INSTITUTO MUNICIPAL DE CULTURA RECREACION Y DEPORTE DE ZIPAQUIRA",
        "amparo": "CUMPLIMIENTO Y RCE",
        "no_anexo": "2",
        "compania": "SEGUROS MUNDIAL",
        "valor": "$0",
        "numero_poliza": "",  # sin número — se generará IMPORT-4
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "VISION INTEGRAL",
        "observaciones": "Es una modificacion, pero la pago el proyecto",
        "cdp": "",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 5,
        "contrato": "CONTRATO INTERADMINISTRATIVO NºCD-CINT-170-2025",
        "entidad": "MUNICIPIO DE JUNIN CUNDINAMARCA",
        "amparo": "CUMPLIMIENTO",
        "no_anexo": "2",
        "compania": "SEGUROS DEL ESTADO S.A.",
        "valor": "$329.245,00",
        "numero_poliza": "11-44-101256097",
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": "ok",
        "cdp": "1033",
        "op": "1549",
        "fecha_pago": "",
    },
    {
        "no": 6,
        "contrato": "CONTRATO INTERADMINISTRATIVO NºCD-CINT-170-2025",
        "entidad": "MUNICIPIO DE JUNIN CUNDINAMARCA",
        "amparo": "",  # vacío — se mapeará a OTRO
        "no_anexo": "3",
        "compania": "SEGUROS DEL ESTADO S.A.",
        "valor": "$14.280,00",
        "numero_poliza": "11-44-101256097",  # duplicado de fila 5 — se sufijará
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": "",
        "cdp": "1033",
        "op": "1547",
        "fecha_pago": "",
    },
    {
        "no": 7,
        "contrato": "CONTRATO INTERADMINISTRATIVO 1138-2024",
        "entidad": "MINISTERIO DE SALUD Y PROTECCION SOCIAL",
        "amparo": "CUMPLIMIENTO",
        "no_anexo": "3",
        "compania": "SEGUROS COMERCIALES BOLIVAR S.A.",
        "valor": "$8.479,00",
        "numero_poliza": "1505003552801",
        "fecha_expedicion": "04/05/2026",
        "dias_cartera": "36",
        "intermediario": "MCALLISTER E HIJOS ASOCIADOS LTDA",
        "observaciones": "",
        "cdp": "1034",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 8,
        "contrato": "CONVENIO INTERADMINISTRATIVO N 713-2023",
        "entidad": "MINISTERIO DE LAS TECNOLOGIAS DE LA INFORMACION Y LAS COMUNICACIONES",
        "amparo": "CUMPLIMIENTO",
        "no_anexo": "",
        "compania": "ASEGURADORA SOLIDARIA DE COLOMBIA",
        "valor": "$1.175.439,00",
        "numero_poliza": "980-47-994000024976",
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "ARREZOLA SEGUROS LTDA",  # typo en fuente; coincide con Arrazola
        "observaciones": "CDP CARGADO A LA CARPETA",
        "cdp": "1059",
        "op": "",
        "fecha_pago": "15/05/2026",
    },
    {
        "no": 9,
        "contrato": "CONTRATO INTERADMINISTRATIVO No. FDLBOSA CD 919-2025",
        "entidad": "FONDO DE DESARROLLO LOCAL DE BOSA",
        "amparo": "",
        "no_anexo": "",
        "compania": "",  # sin compañía → SKIP
        "valor": "",
        "numero_poliza": "",
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "",
        "observaciones": "",
        "cdp": "",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 10,
        "contrato": "Contrato Interadministrativo 050.3.021.027.052.2026 de 2026",
        "entidad": "UNIVERSIDAD DEL VALLE",
        "amparo": "",
        "no_anexo": "3 y 4",
        "compania": "SEGUROS DEL ESTADO S.A.",
        "valor": "-",
        "numero_poliza": "11-45-101182031",
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "VISION INTEGRAL ASESORES",
        "observaciones": "El proyecto realizo el pago",
        "cdp": "",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 11,
        "contrato": "",  # sin contrato ni entidad identificados
        "entidad": "",
        "amparo": "",
        "no_anexo": "1",
        "compania": "SEGUROS DEL ESTADO S.A.",
        "valor": "$54.852,00",
        "numero_poliza": "11-44-101258722",
        "fecha_expedicion": "14/05/2026",
        "dias_cartera": "",
        "intermediario": "",
        "observaciones": "",
        "cdp": "1075",
        "op": "4116",
        "fecha_pago": "15/05/2026",
    },
    {
        "no": 12,
        "contrato": "CI 1694",
        "entidad": "ALCALDIA DE CIUDAD BOLIVAR",
        "amparo": "",
        "no_anexo": "",
        "compania": "SEGUROS MUNDIAL",
        "valor": "",
        "numero_poliza": "",  # sin número — se generará IMPORT-12
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "",
        "observaciones": "",
        "cdp": "",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 13,
        "contrato": "Contrato 1134 de 2024",
        "entidad": "FONDO DE DESARROLLO LOCAL DE KENNEDY",
        "amparo": "CUMPLIMIENTO",
        "no_anexo": "3",
        "compania": "ASEGURADORA SOLIDARIA DE COLOMBIA",
        "valor": "$645.632,00",
        "numero_poliza": "310-47-99400002979-3",
        "fecha_expedicion": "10/04/2026",
        "dias_cartera": "60",
        "intermediario": "LHM SEGUROS LTDA",
        "observaciones": "",
        "cdp": "",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 14,
        "contrato": "",
        "entidad": "FONDO DE DESARROLLO LOCAL DE BOSA",  # normalizado typo original
        "amparo": "",
        "no_anexo": "4",
        "compania": "SEGUROS DEL ESTADO S.A.",
        "valor": "$600.623,00",
        "numero_poliza": "11-44-101269895",
        "fecha_expedicion": "08/05/2026",
        "dias_cartera": "32",
        "intermediario": "",
        "observaciones": "",
        "cdp": "441",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 15,
        "contrato": "CF RC.2022-0475 ICETEX",
        "entidad": "INSTITUTO COLOMBIANO DE CREDITO EDUCATIVO Y ESTUDIOS TECNICOS EN EL EXTERIOR MARIANO OSPINA PEREZ ICETEX",
        "amparo": "",
        "no_anexo": "6",
        "compania": "SEGUROS DEL ESTADO S.A.",
        "valor": "$370.944,00",
        "numero_poliza": "17-45-101046285",
        "fecha_expedicion": "28/04/2026",
        "dias_cartera": "42",
        "intermediario": "",
        "observaciones": "",
        "cdp": "1068",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 16,
        "contrato": "",
        "entidad": "IDEXUD - SEGUROS GENERALES DE RESPONSABILIDAD CIVIL",  # objeto real en fuente
        "amparo": "RESPONSABILIDAD_CIVIL",
        "no_anexo": "0",
        "compania": "SEGUROS MUNDIAL",
        "valor": "$142.243,00",
        "numero_poliza": "NB-100448164",
        "fecha_expedicion": "25/05/2026",
        "dias_cartera": "15",
        "intermediario": "",
        "observaciones": "Servicios de seguros generales de responsabilidad civil",
        "cdp": "1004",
        "op": "",
        "fecha_pago": "",
    },
    {
        "no": 17,
        "contrato": "1156",
        "entidad": "FONDO DE DESARROLLO LOCAL DE KENNEDY",
        "amparo": "",
        "no_anexo": "",
        "compania": "",  # sin compañía → SKIP
        "valor": "",
        "numero_poliza": "",
        "fecha_expedicion": "",
        "dias_cartera": "",
        "intermediario": "",
        "observaciones": "",
        "cdp": "",
        "op": "",
        "fecha_pago": "",
    },
]

# ---------------------------------------------------------------------------
# Funciones de limpieza / parsing
# ---------------------------------------------------------------------------

_TIPO_MAP: dict[str, TipoPoliza] = {
    "CUMPLIMIENTO": TipoPoliza.CUMPLIMIENTO,
    "RCE": TipoPoliza.RCE,
    "RESPONSABILIDAD CIVIL": TipoPoliza.RESPONSABILIDAD_CIVIL,
    "RESPONSABILIDAD_CIVIL": TipoPoliza.RESPONSABILIDAD_CIVIL,
    "CALIDAD SERVICIO": TipoPoliza.CALIDAD_SERVICIO,
    "PAGO SALARIOS": TipoPoliza.PAGO_SALARIOS,
    "ESTABILIDAD OBRA": TipoPoliza.ESTABILIDAD_OBRA,
    "CORRECTO MANEJO": TipoPoliza.CORRECTO_MANEJO,
}


def mapear_tipo(amparo: str) -> TipoPoliza:
    """Convierte la columna Amparo al enum TipoPoliza."""
    s = amparo.strip().upper()
    if not s:
        return TipoPoliza.OTRO
    # Coincidencia exacta
    if s in _TIPO_MAP:
        return _TIPO_MAP[s]
    # Contiene dos tipos (ej. "CUMPLIMIENTO Y RCE") → usar el primero
    for key, tipo in _TIPO_MAP.items():
        if key in s:
            return tipo
    return TipoPoliza.OTRO


def limpiar_monto(valor_str: str) -> Decimal:
    """
    Convierte montos en formato colombiano a Decimal.
    Ejemplos:
      "$1.175.439,00"  → Decimal("1175439.00")
      "$ -"            → Decimal("0")
      "-"              → Decimal("0")
    """
    s = valor_str.strip().lstrip("$").strip()
    if not s or s in ("-", "—", ""):
        return Decimal("0")
    # En Colombia: punto = miles, coma = decimales
    s = s.replace(".", "").replace(",", ".").replace(" ", "")
    try:
        return Decimal(s)
    except InvalidOperation:
        return Decimal("0")


def parsear_fecha(fecha_str: str) -> date | None:
    """
    Convierte 'DD/MM/YYYY' a date. Retorna None si está vacío o es inválido.
    """
    s = fecha_str.strip()
    if not s:
        return None
    try:
        return date(int(s[6:]), int(s[3:5]), int(s[:2]))
    except (ValueError, IndexError):
        return None


def normalizar_numero_poliza(raw: str) -> str:
    """Elimina espacios alrededor de guiones y convierte a mayúsculas."""
    return re.sub(r"\s*-\s*", "-", raw.strip().upper())


def nit_placeholder(nombre: str) -> str:
    """Genera un NIT provisional único basado en el nombre."""
    return "IMP-" + hashlib.md5(nombre.encode("utf-8")).hexdigest()[:8].upper()


def _puntuacion_similitud(nombre_dato: str, empresa_db: str) -> int:
    """
    Cuenta cuántas palabras (>=4 letras) del nombre_dato aparecen en
    empresa_db (ambos normalizados a mayúsculas). Sirve para fuzzy-match
    de corredores con typos (ej. ARREZOLA ↔ Arrazola).
    """
    a = set(re.findall(r"[A-Z]{4,}", nombre_dato.upper()))
    b = re.sub(r"[^A-Z ]", "", empresa_db.upper())
    return sum(1 for w in a if w in b)


# ---------------------------------------------------------------------------
# Clase principal
# ---------------------------------------------------------------------------

class ImportadorPolizas:

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._cache_aseg: dict[str, int] = {}     # nombre normalizado → id
        self._cache_cont: dict[str, int] = {}     # nombre normalizado → id
        self._cache_corr: dict[str, int | None] = {}  # nombre normalizado → id|None
        self._polizas_existentes: set[str] = set()
        self._numeros_en_sesion: dict[str, int] = {}  # para detectar duplicados dentro del lote
        # Contadores de resumen
        self.ok = 0
        self.skip = 0
        self.fail = 0
        self.aseg_nuevas = 0
        self.cont_nuevas = 0
        self.corr_no_hallados: list[str] = []

    # ------------------------------------------------------------------
    # Orquestador principal
    # ------------------------------------------------------------------

    async def ejecutar(self) -> None:
        log.info("Cargando estado previo de la BD…")
        await self._cargar_polizas_existentes()

        for fila in POLIZAS_RAW:
            try:
                await self._procesar_fila(fila)
            except Exception as exc:
                self.fail += 1
                log.error("Fila %s — ERROR INESPERADO: %s", fila["no"], exc)
                await self.db.rollback()

        log.info("")
        log.info("=" * 55)
        log.info("RESUMEN FINAL")
        log.info("  Importadas:              %d", self.ok)
        log.info("  Omitidas (skip/dup):     %d", self.skip)
        log.info("  Fallidas (error):        %d", self.fail)
        log.info("  Nuevas aseguradoras:     %d", self.aseg_nuevas)
        log.info("  Nuevas contratistas:     %d", self.cont_nuevas)
        if self.corr_no_hallados:
            log.warning("  Corredores NO hallados: %s", ", ".join(self.corr_no_hallados))
        else:
            log.info("  Todos los corredores fueron asignados.")
        log.info("=" * 55)

    # ------------------------------------------------------------------
    # Cargar pólizas ya existentes (para idempotencia)
    # ------------------------------------------------------------------

    async def _cargar_polizas_existentes(self) -> None:
        result = await self.db.execute(select(Poliza.numero_poliza))
        self._polizas_existentes = {row[0] for row in result.all()}
        log.info("  Pólizas ya en BD: %d", len(self._polizas_existentes))

    # ------------------------------------------------------------------
    # Procesamiento de una fila
    # ------------------------------------------------------------------

    async def _procesar_fila(self, fila: dict) -> None:
        no = fila["no"]

        # ── Validación mínima: necesitamos compañía para poder crear la póliza ──
        if not fila["compania"].strip():
            self.skip += 1
            log.warning("Fila %2d → SIN COMPAÑIA — omitida", no)
            return

        # ── Número de póliza ────────────────────────────────────────────────────
        raw_num = fila["numero_poliza"].strip()
        if raw_num:
            num_base = normalizar_numero_poliza(raw_num)
        else:
            num_base = f"IMPORT-{no}-{HOY.strftime('%Y%m%d')}"
            log.warning("Fila %2d → sin número de póliza; asignado: %s", no, num_base)

        # Resolver duplicados (dentro del lote y contra la BD)
        numero_poliza = self._resolver_numero_unico(num_base, fila.get("no_anexo", ""))

        # ── Comprobación de idempotencia ────────────────────────────────────────
        if numero_poliza in self._polizas_existentes:
            self.skip += 1
            log.info("Fila %2d → Póliza %s ya existe — omitida", no, numero_poliza)
            return

        # ── Entidades relacionadas ──────────────────────────────────────────────
        aseg_id = await self._buscar_o_crear_aseguradora(fila["compania"].strip())
        cont_id = await self._buscar_o_crear_contratista(fila["entidad"].strip() or f"ENTIDAD-NO-ID-FILA-{no}")
        corr_id = await self._buscar_corredor(fila["intermediario"].strip())

        # ── Valores monetarios ──────────────────────────────────────────────────
        valor_prima = limpiar_monto(fila["valor"])
        # Nota: "Valor" en la fuente es la prima, no el valor asegurado.
        # valor_asegurado se iguala a valor_prima como placeholder; actualizar con valor real.
        valor_asegurado = valor_prima if valor_prima >= Decimal("1000") else Decimal("1000000")

        # ── Fechas ──────────────────────────────────────────────────────────────
        fecha_expedicion = parsear_fecha(fila["fecha_expedicion"])
        fecha_pago = parsear_fecha(fila["fecha_pago"])
        vigencia_desde = fecha_expedicion or date(2026, 1, 1)

        dias_cartera_raw = fila.get("dias_cartera", "").strip()
        dias_cartera = int(dias_cartera_raw) if dias_cartera_raw.isdigit() else 0
        if dias_cartera > 0:
            vigencia_hasta = HOY + timedelta(days=dias_cartera)
        else:
            vigencia_hasta = vigencia_desde + timedelta(days=365)

        # La vigencia_hasta debe ser posterior a vigencia_desde
        if vigencia_hasta <= vigencia_desde:
            vigencia_hasta = vigencia_desde + timedelta(days=365)

        # ── Estado de la póliza ─────────────────────────────────────────────────
        if 0 < dias_cartera <= 30:
            estado = EstadoPoliza.POR_VENCER
        elif dias_cartera == 0 and fecha_expedicion and fecha_expedicion < HOY:
            estado = EstadoPoliza.ACTIVA  # no se sabe; asumir activa
        else:
            estado = EstadoPoliza.ACTIVA

        # ── Estado de cartera ───────────────────────────────────────────────────
        cdp = fila.get("cdp", "").strip()
        op = fila.get("op", "").strip()
        if op and cdp:
            estado_cartera = EstadoCartera.PAGADO
        elif cdp:
            estado_cartera = EstadoCartera.PENDIENTE_REINTEGRO
        else:
            estado_cartera = EstadoCartera.NO_APLICA

        # ── Tipo (Amparo) ───────────────────────────────────────────────────────
        tipo = mapear_tipo(fila["amparo"])

        # ── Notas internas ──────────────────────────────────────────────────────
        notas_partes = []
        if fila.get("observaciones", "").strip():
            notas_partes.append(fila["observaciones"].strip())
        notas_partes.append("[IMPORTADO] valor_asegurado = prima; verificar y actualizar con valor real.")
        if not fila["numero_poliza"].strip():
            notas_partes.append(f"[IMPORTADO] Número provisional asignado; reemplazar con número real.")
        notas_internas = " | ".join(notas_partes)

        # ── Crear objeto Poliza ─────────────────────────────────────────────────
        poliza = Poliza(
            numero_poliza=numero_poliza,
            tipo=tipo,
            modalidad=ModalidadGarantia.POLIZA_SEGURO,
            estado=estado,
            vigencia_desde=vigencia_desde,
            vigencia_hasta=vigencia_hasta,
            valor_asegurado=valor_asegurado,
            valor_prima=valor_prima if valor_prima > 0 else None,
            numero_contrato=fila["contrato"].strip()[:100] or None,
            objeto_contrato=fila["contrato"].strip()[:2000] or None,
            numero_adicion=fila.get("no_anexo", "").strip()[:50] or None,
            aseguradora_id=aseg_id,
            contratista_id=cont_id,
            corredor_id=corr_id,
            fecha_radicacion=fecha_expedicion,
            notas_internas=notas_internas[:5000],
            estado_cartera=estado_cartera,
            centro_costo_solicitante=cdp[:100] if cdp else None,
            orden_pago_numero=op[:50] if op else None,
            orden_pago_fecha=fecha_pago,
            alertas_enviadas=0,
            modificado_por="importador_polizas_reales",
        )

        self.db.add(poliza)
        await self.db.flush()  # obtiene el id

        # Crear checklist vacío asociado
        self.db.add(ChecklistExpedicion(poliza_id=poliza.id))

        await self.db.commit()

        # Registrar en cache para detectar futuros duplicados en el mismo lote
        self._polizas_existentes.add(numero_poliza)
        self.ok += 1
        log.info("Fila %2d → OK  | %-40s | id=%d | %s", no, numero_poliza, poliza.id, tipo.value)

    # ------------------------------------------------------------------
    # Resolución de números duplicados
    # ------------------------------------------------------------------

    def _resolver_numero_unico(self, num_base: str, no_anexo: str) -> str:
        """
        Si num_base ya fue visto en este lote o en la BD, añade el sufijo del
        anexo para diferenciarlo. Si sigue siendo duplicado, añade un contador.
        """
        if num_base not in self._polizas_existentes and num_base not in self._numeros_en_sesion:
            self._numeros_en_sesion[num_base] = 1
            return num_base

        # Intentar con sufijo de anexo
        anexo = no_anexo.strip()
        if anexo:
            # Limpiar: "3 y 4" → "3Y4"
            anexo_limpio = re.sub(r"[^A-Z0-9]", "", anexo.upper().replace(" Y ", "Y"))
            candidato = f"{num_base}-ANEX{anexo_limpio}"
            if candidato not in self._polizas_existentes and candidato not in self._numeros_en_sesion:
                self._numeros_en_sesion[candidato] = 1
                log.warning("Número duplicado '%s' → renombrado a '%s'", num_base, candidato)
                return candidato

        # Fallback: contador incremental
        contador = self._numeros_en_sesion.get(num_base, 0) + 1
        self._numeros_en_sesion[num_base] = contador
        candidato = f"{num_base}-DUP{contador}"
        log.warning("Número duplicado '%s' → renombrado a '%s'", num_base, candidato)
        return candidato

    # ------------------------------------------------------------------
    # Buscar o crear Aseguradora
    # ------------------------------------------------------------------

    async def _buscar_o_crear_aseguradora(self, nombre: str) -> int:
        # Normalizar (ej. "SEGUROS MUNDIAL" ≈ "MUNDIAL DE SEGUROS SA")
        clave = nombre.upper()

        if clave in self._cache_aseg:
            return self._cache_aseg[clave]

        # Buscar por coincidencia parcial con las palabras clave
        resultado = await self.db.execute(select(Aseguradora))
        todas = resultado.scalars().all()

        mejor: Aseguradora | None = None
        mejor_score = 0
        for aseg in todas:
            score = _puntuacion_similitud(nombre, aseg.nombre)
            if score > mejor_score:
                mejor_score = score
                mejor = aseg

        if mejor and mejor_score >= 2:
            self._cache_aseg[clave] = mejor.id
            return mejor.id

        # Crear nueva
        nueva = Aseguradora(
            nombre=nombre[:200],
            nit=nit_placeholder(nombre),
        )
        self.db.add(nueva)
        await self.db.flush()
        self._cache_aseg[clave] = nueva.id
        self.aseg_nuevas += 1
        log.info("  [NUEVA ASEG]  %s (id=%d)", nombre, nueva.id)
        return nueva.id

    # ------------------------------------------------------------------
    # Buscar o crear Contratista
    # ------------------------------------------------------------------

    async def _buscar_o_crear_contratista(self, nombre: str) -> int:
        clave = nombre.upper()

        if clave in self._cache_cont:
            return self._cache_cont[clave]

        # Buscar coincidencia exacta en BD (insensible a mayúsculas)
        resultado = await self.db.execute(
            select(Contratista).where(
                Contratista.nombre_razon_social.ilike(nombre)
            )
        )
        existente = resultado.scalar_one_or_none()

        if existente:
            self._cache_cont[clave] = existente.id
            return existente.id

        # Buscar coincidencia parcial (primeras 30 letras, insensible a mayúsculas)
        fragmento = nombre[:30]
        resultado2 = await self.db.execute(
            select(Contratista).where(
                Contratista.nombre_razon_social.ilike(f"%{fragmento}%")
            )
        )
        parcial = resultado2.scalar_one_or_none()

        if parcial:
            self._cache_cont[clave] = parcial.id
            return parcial.id

        # Crear nuevo
        nuevo = Contratista(
            tipo=TipoContratista.PERSONA_JURIDICA,
            nombre_razon_social=nombre[:300],
            numero_identificacion=nit_placeholder(nombre),
        )
        self.db.add(nuevo)
        await self.db.flush()
        self._cache_cont[clave] = nuevo.id
        self.cont_nuevas += 1
        log.info("  [NUEVO CONT]  %s (id=%d)", nombre[:60], nuevo.id)
        return nuevo.id

    # ------------------------------------------------------------------
    # Buscar Corredor (fuzzy, sin crear nuevos)
    # ------------------------------------------------------------------

    async def _buscar_corredor(self, intermediario: str) -> int | None:
        if not intermediario.strip():
            return None

        clave = intermediario.upper().strip()
        if clave in self._cache_corr:
            return self._cache_corr[clave]

        resultado = await self.db.execute(select(Corredor))
        todos = resultado.scalars().all()

        mejor: Corredor | None = None
        mejor_score = 0
        for corr in todos:
            score = _puntuacion_similitud(intermediario, corr.empresa)
            if score > mejor_score:
                mejor_score = score
                mejor = corr

        if mejor and mejor_score >= 1:
            self._cache_corr[clave] = mejor.id
            log.debug("  Corredor '%s' → '%s' (score=%d)", intermediario, mejor.empresa, mejor_score)
            return mejor.id

        # No encontrado
        self._cache_corr[clave] = None
        if intermediario not in self.corr_no_hallados:
            self.corr_no_hallados.append(intermediario)
        log.warning("  [SIN CORREDOR] '%s' no coincide con ningún registro en BD", intermediario)
        return None


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    print("=" * 55)
    print("Importador de Pólizas Reales — IDEXUD")
    print(f"Fecha: {HOY}  |  Filas a procesar: {len(POLIZAS_RAW)}")
    print("=" * 55)

    await init_db()

    async with AsyncSessionLocal() as db:
        importador = ImportadorPolizas(db)
        await importador.ejecutar()


if __name__ == "__main__":
    asyncio.run(main())
