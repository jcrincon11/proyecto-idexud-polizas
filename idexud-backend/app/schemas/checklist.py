"""
app/schemas/checklist.py
=========================
Schemas para el checklist de expedición de pólizas.

PolizaChecklistUpdate  → PATCH /polizas/{id}/checklist
ChecklistResponse      → respuesta embebida en PolizaResponseDetalle
ChecklistPasoToggle    → body simplificado para marcar/desmarcar un paso
"""
from datetime import datetime
from app.schemas.base import SchemaBase


class ChecklistPasoToggle(SchemaBase):
    """
    Body del PATCH para marcar o desmarcar UN paso específico.
    El frontend envía: { "campo": "paso3_borrador_revisado", "valor": true, "responsable": "María J." }
    """
    campo:       str            # nombre exacto del campo boolean en el modelo
    valor:       bool           # True = marcar completado, False = desmarcar
    responsable: str | None = None   # quién completó el paso
    nota:        str | None = None   # nota adicional (para paso2_observacion, etc.)


class PolizaChecklistUpdate(SchemaBase):
    """Actualización parcial de cualquier campo del checklist."""
    paso1_solicitud_recibida:   bool | None = None
    paso1_responsable:          str  | None = None

    paso2_docs_verificados:     bool | None = None
    paso2_responsable:          str  | None = None
    paso2_observacion:          str  | None = None

    paso3_borrador_revisado:    bool | None = None
    paso3_responsable:          str  | None = None

    paso4_aprobada_juridica:    bool | None = None
    paso4_responsable:          str  | None = None

    paso5_emitida_aseguradora:  bool | None = None

    paso6_radicada_idexud:      bool | None = None
    paso6_numero_radicado:      str  | None = None

    paso7_ingresada_sistema:    bool | None = None
    paso7_responsable:          str  | None = None

    paso8_supervisor_notificado: bool | None = None
    paso8_email_destino:         str  | None = None

    paso9_incluida_cartera:     bool | None = None

    paso10_archivada:           bool | None = None
    paso10_ubicacion_fisico:    str  | None = None

    notas:                      str  | None = None


class ChecklistResponse(SchemaBase):
    """Respuesta completa del checklist para el frontend."""
    id:          int
    poliza_id:   int

    paso1_solicitud_recibida:    bool
    paso1_fecha:                 datetime | None = None
    paso1_responsable:           str      | None = None

    paso2_docs_verificados:      bool
    paso2_fecha:                 datetime | None = None
    paso2_responsable:           str      | None = None
    paso2_observacion:           str      | None = None

    paso3_borrador_revisado:     bool
    paso3_fecha:                 datetime | None = None
    paso3_responsable:           str      | None = None

    paso4_aprobada_juridica:     bool
    paso4_fecha:                 datetime | None = None
    paso4_responsable:           str      | None = None

    paso5_emitida_aseguradora:   bool
    paso5_fecha:                 datetime | None = None

    paso6_radicada_idexud:       bool
    paso6_fecha:                 datetime | None = None
    paso6_numero_radicado:       str      | None = None

    paso7_ingresada_sistema:     bool
    paso7_fecha:                 datetime | None = None
    paso7_responsable:           str      | None = None

    paso8_supervisor_notificado: bool
    paso8_fecha:                 datetime | None = None
    paso8_email_destino:         str      | None = None

    paso9_incluida_cartera:      bool
    paso9_fecha:                 datetime | None = None

    paso10_archivada:            bool
    paso10_fecha:                datetime | None = None
    paso10_ubicacion_fisico:     str      | None = None

    notas:                       str      | None = None
    updated_at:                  datetime
