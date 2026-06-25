"""
app/schemas/poliza.py
=====================
Schemas Pydantic v2 para el recurso Póliza.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Optional

from pydantic import (
    Field,
    computed_field,
    field_validator,
    model_validator,
)
from pydantic.functional_validators import AfterValidator

from app.models.poliza import EstadoCartera, EstadoPoliza, ModalidadGarantia, TipoPoliza
from app.schemas.corredor import CorredorResumen  # noqa: F401 — re-exportado
from app.schemas.base import (
    CopAmount,
    Porcentaje,
    SchemaBase,
    format_cop,
    format_fecha_co,
)


# ═════════════════════════════════════════════════════════════════════════════
# SCHEMAS AUXILIARES
# ═════════════════════════════════════════════════════════════════════════════

class AseguradoraResumen(SchemaBase):
    id: int
    nombre: str
    nit: str
    contacto_email: str | None = None
    contacto_telefono: str | None = None

class ContratistaResumen(SchemaBase):
    id: int
    nombre_razon_social: str
    numero_identificacion: str
    email: str | None = None
    telefono: str | None = None

class SiniestroResumen(SchemaBase):
    id: int
    numero_radicado: str | None = None
    fecha_ocurrencia: date
    estado: str
    valor_reclamado: CopAmount | None = None

    @computed_field
    @property
    def valor_reclamado_fmt(self) -> str | None:
        return format_cop(self.valor_reclamado)

class ChecklistResumen(SchemaBase):
    id: int
    paso1_solicitud_recibida: bool
    paso2_docs_verificados: bool
    paso3_borrador_revisado: bool
    paso4_aprobada_juridica: bool
    paso5_emitida_aseguradora: bool
    paso6_radicada_idexud: bool
    paso7_ingresada_sistema: bool
    paso8_supervisor_notificado: bool
    paso9_incluida_cartera: bool
    paso10_archivada: bool

    @computed_field
    @property
    def pasos_completados(self) -> int:
        return sum([
            self.paso1_solicitud_recibida, self.paso2_docs_verificados,
            self.paso3_borrador_revisado, self.paso4_aprobada_juridica,
            self.paso5_emitida_aseguradora, self.paso6_radicada_idexud,
            self.paso7_ingresada_sistema, self.paso8_supervisor_notificado,
            self.paso9_incluida_cartera, self.paso10_archivada,
        ])

    @computed_field
    @property
    def porcentaje_completitud(self) -> float:
        return round((self.pasos_completados / 10) * 100, 1)

    @computed_field
    @property
    def esta_completo(self) -> bool:
        return self.pasos_completados == 10


# ═════════════════════════════════════════════════════════════════════════════
# BASE 
# ═════════════════════════════════════════════════════════════════════════════

class PolizaBase(SchemaBase):
    numero_poliza: str = Field(..., min_length=3, max_length=100)
    tipo: TipoPoliza
    modalidad: ModalidadGarantia = Field(default=ModalidadGarantia.POLIZA_SEGURO)
    vigencia_desde: date
    vigencia_hasta: date
    valor_asegurado: CopAmount | None = None
    valor_prima: CopAmount | None = None
    porcentaje_cobertura: Porcentaje | None = None
    numero_contrato: str | None = Field(default=None, max_length=100)
    objeto_contrato: str | None = Field(default=None, max_length=2000)
    valor_contrato: CopAmount | None = None
    numero_adicion: str | None = Field(default=None, max_length=50)
    fecha_radicacion: date | None = None
    requiere_acta_inicio: bool = Field(default=False)
    notas_internas: str | None = Field(default=None, max_length=5000)
    aseguradora_id: int = Field(..., gt=0)
    contratista_id: int = Field(..., gt=0)
    corredor_id: int | None = Field(default=None, gt=0)
    poliza_anterior_id: int | None = Field(default=None, gt=0)

    @field_validator("numero_poliza")
    @classmethod
    def numero_poliza_formato(cls, v: str) -> str:
        v = v.upper().strip()
        if v.isdigit():
            raise ValueError("El número de póliza no puede ser solo dígitos.")
        return v

    @field_validator("vigencia_desde", "vigencia_hasta")
    @classmethod
    def fecha_no_muy_antigua(cls, v: date) -> date:
        if v.year < 2000:
            raise ValueError("El sistema no acepta fechas anteriores al año 2000.")
        return v

    @field_validator("valor_asegurado")
    @classmethod
    def valor_asegurado_minimo(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v < Decimal("0"):
            raise ValueError("El valor asegurado no puede ser negativo.")
        return v

    @model_validator(mode="after")
    def vigencias_coherentes(self) -> "PolizaBase":
        desde = self.vigencia_desde
        hasta = self.vigencia_hasta
        if desde is None or hasta is None: return self
        if hasta <= desde:
            raise ValueError("'vigencia_hasta' debe ser posterior a 'vigencia_desde'.")
        return self

    @model_validator(mode="after")
    def valor_contrato_mayor_que_asegurado(self) -> "PolizaBase":
        if self.valor_contrato and self.valor_asegurado:
            if self.tipo == TipoPoliza.CUMPLIMIENTO and self.valor_asegurado > self.valor_contrato:
                raise ValueError("El valor asegurado no puede superar el valor del contrato.")
        return self


class PolizaCreate(PolizaBase):
    pass


class PolizaUpdate(SchemaBase):
    numero_poliza: str | None = Field(default=None, min_length=3, max_length=100)
    tipo: TipoPoliza | None = None
    modalidad: ModalidadGarantia | None = None
    estado: EstadoPoliza | None = None
    vigencia_desde: date | None = None
    vigencia_hasta: date | None = None
    valor_asegurado: CopAmount | None = None
    valor_prima: CopAmount | None = None
    porcentaje_cobertura: Porcentaje | None = None
    numero_contrato: str | None = Field(default=None, max_length=100)
    objeto_contrato: str | None = Field(default=None, max_length=2000)
    valor_contrato: CopAmount | None = None
    numero_adicion: str | None = Field(default=None, max_length=50)
    aseguradora_id: int | None = Field(default=None, gt=0)
    contratista_id: int | None = Field(default=None, gt=0)
    corredor_id: int | None = Field(default=None, gt=0)
    poliza_anterior_id: int | None = Field(default=None, gt=0)
    fecha_radicacion: date | None = None
    fecha_aprobacion: date | None = None
    aprobado_por: str | None = Field(default=None, max_length=150)
    requiere_acta_inicio: bool | None = None
    notas_internas: str | None = Field(default=None, max_length=5000)
    centro_costo_solicitante: str | None = Field(default=None, max_length=100)
    enlace_soporte_pago: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def vigencias_coherentes_si_presentes(self) -> "PolizaUpdate":
        desde = self.vigencia_desde
        hasta = self.vigencia_hasta
        if desde and hasta and hasta <= desde:
            raise ValueError("'vigencia_hasta' debe ser posterior a 'vigencia_desde'.")
        return self


# ═════════════════════════════════════════════════════════════════════════════
# RESPONSE — BLINDADO PARA ACEPTAR NULOS DE PMO
# ═════════════════════════════════════════════════════════════════════════════

class PolizaResponse(SchemaBase):
    id: int
    numero_poliza: str | None = None
    tipo: TipoPoliza
    modalidad: ModalidadGarantia
    estado: EstadoPoliza
    vigencia_desde: date | None = None
    vigencia_hasta: date | None = None
    valor_asegurado: Decimal | None = None
    valor_prima: Decimal | None = None
    porcentaje_cobertura: Decimal | None = None
    numero_contrato: str | None = None
    objeto_contrato: str | None = None
    valor_contrato: Decimal | None = None
    numero_adicion: str | None = None
    aseguradora_id: int | None = None
    contratista_id: int | None = None
    corredor_id: int | None = None
    contratista: ContratistaResumen | None = None
    modificado_por: str | None = None
    centro_costo_solicitante: str | None = None
    centro_costo_pagador: str | None = None
    estado_cartera: EstadoCartera | None = None
    poliza_anterior_id: int | None = None
    fecha_radicacion: date | None = None
    fecha_aprobacion: date | None = None
    aprobado_por: str | None = None
    requiere_acta_inicio: bool
    alertas_enviadas: int | None = 0
    notas_internas: str | None = None
    enlace_soporte_pago: str | None = None
    checklist: ChecklistResumen | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def dias_para_vencer(self) -> int:
        if not self.vigencia_hasta: return 0
        from datetime import date as date_today
        return (self.vigencia_hasta - date_today.today()).days

    @computed_field
    @property
    def esta_vigente(self) -> bool:
        if not self.vigencia_desde or not self.vigencia_hasta: return False
        from datetime import date as date_today
        hoy = date_today.today()
        return self.vigencia_desde <= hoy <= self.vigencia_hasta

    @computed_field
    @property
    def etiqueta_estado(self) -> str:
        _etiquetas = {
            EstadoPoliza.BORRADOR: "Borrador",
            EstadoPoliza.PENDIENTE_REVISION: "Pendiente de Revisión",
            EstadoPoliza.ACTIVA: "Activa",
            EstadoPoliza.POR_VENCER: "Por Vencer",
            EstadoPoliza.VENCIDA: "Vencida",
            EstadoPoliza.RENOVADA: "Renovada",
            EstadoPoliza.ANULADA: "Anulada",
        }
        return _etiquetas.get(self.estado, self.estado.value)

    @computed_field
    @property
    def etiqueta_tipo(self) -> str:
        _etiquetas = {
            TipoPoliza.CUMPLIMIENTO: "Cumplimiento",
            TipoPoliza.RCE: "Responsabilidad Civil Extracontractual",
            TipoPoliza.CALIDAD_SERVICIO: "Calidad del Servicio",
            TipoPoliza.PAGO_SALARIOS: "Pago de Salarios y Prestaciones",
            TipoPoliza.ESTABILIDAD_OBRA: "Estabilidad de Obra",
            TipoPoliza.CORRECTO_MANEJO: "Correcto Manejo del Anticipo",
            TipoPoliza.RESPONSABILIDAD_CIVIL: "Responsabilidad Civil",
            TipoPoliza.OTRO: "Otro",
        }
        return _etiquetas.get(self.tipo, self.tipo.value)

    @computed_field
    @property
    def valor_asegurado_fmt(self) -> str:
        if not self.valor_asegurado: return "—"
        return format_cop(self.valor_asegurado) or "$ 0,00"

    @computed_field
    @property
    def valor_prima_fmt(self) -> str | None:
        return format_cop(self.valor_prima) if self.valor_prima else "—"

    @computed_field
    @property
    def valor_contrato_fmt(self) -> str | None:
        return format_cop(self.valor_contrato) if self.valor_contrato else "—"

    @computed_field
    @property
    def vigencia_desde_fmt(self) -> str:
        return format_fecha_co(self.vigencia_desde) if self.vigencia_desde else "—"

    @computed_field
    @property
    def vigencia_hasta_fmt(self) -> str:
        return format_fecha_co(self.vigencia_hasta) if self.vigencia_hasta else "—"

    @computed_field
    @property
    def fecha_radicacion_fmt(self) -> str | None:
        return format_fecha_co(self.fecha_radicacion) if self.fecha_radicacion else None

    @computed_field
    @property
    def fecha_aprobacion_fmt(self) -> str | None:
        return format_fecha_co(self.fecha_aprobacion) if self.fecha_aprobacion else None

    @computed_field
    @property
    def nivel_alerta(self) -> str:
        if not self.vigencia_hasta: return "gris"
        dias = self.dias_para_vencer
        if self.estado in (EstadoPoliza.VENCIDA, EstadoPoliza.ANULADA, EstadoPoliza.RENOVADA):
            return "gris"
        if dias <= 7: return "rojo"
        if dias <= 15: return "naranja"
        if dias <= 30: return "amarillo"
        return "verde"


class PolizaResponseDetalle(PolizaResponse):
    aseguradora: AseguradoraResumen | None = None
    contratista: ContratistaResumen | None = None
    corredor: CorredorResumen | None = None
    siniestros: list[SiniestroResumen] = Field(default_factory=list)
    checklist: ChecklistResumen | None = None

    @computed_field
    @property
    def total_siniestros(self) -> int:
        return len(self.siniestros)

    @computed_field
    @property
    def valor_total_reclamado(self) -> Decimal:
        return sum(
            (s.valor_reclamado for s in self.siniestros if s.valor_reclamado),
            Decimal("0"),
        )

    @computed_field
    @property
    def valor_total_reclamado_fmt(self) -> str:
        return format_cop(self.valor_total_reclamado) or "$ 0,00"

    @computed_field
    @property
    def progreso_checklist(self) -> float:
        if not self.checklist: return 0.0
        return self.checklist.porcentaje_completitud


class PolizaListResponse(SchemaBase):
    total: int
    pagina: int
    por_pagina: int
    items: list[PolizaResponse]

    @computed_field
    @property
    def paginas(self) -> int:
        if self.por_pagina == 0: return 0
        return -(-self.total // self.por_pagina)