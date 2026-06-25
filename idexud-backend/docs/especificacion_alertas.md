# Especificación de Interfaz para el Motor de Alertas — IDEXUD

**Versión:** 1.0  
**Fecha:** 2026-06-09  
**Estado:** Borrador — pendiente de implementación del motor de alertas

---

## 1. Propósito

Este documento define los campos del modelo `Poliza` y `Corredor` que el motor de alertas futuro deberá consumir para enviar notificaciones de vencimiento, renovación y gestión de cartera a los actores involucrados (corredores, área jurídica, PMO).

---

## 2. Campos en `Poliza` relevantes para el motor de alertas

### 2.1 Fechas de vigencia

| Campo            | Tipo       | Descripción                                                     | Uso en alertas                                                  |
|------------------|------------|-----------------------------------------------------------------|-----------------------------------------------------------------|
| `vigencia_hasta` | `date`     | Fecha de vencimiento de la póliza.                              | **Campo principal** para calcular días restantes y disparar alertas. |
| `vigencia_desde` | `date`     | Fecha de inicio de vigencia.                                    | Verificar que la póliza ya está vigente antes de notificar.     |

### 2.2 Estado y ciclo de vida

| Campo              | Tipo            | Valores posibles                                                | Uso en alertas                                                        |
|--------------------|-----------------|------------------------------------------------------------------|-----------------------------------------------------------------------|
| `estado`           | `EstadoPoliza`  | `ACTIVA`, `POR_VENCER`, `VENCIDA`, `BORRADOR`, `PENDIENTE_REVISION`, `RENOVADA`, `ANULADA` | Solo enviar alertas cuando `estado` es `ACTIVA` o `POR_VENCER`. Nunca alertar pólizas `ANULADAS` o `RENOVADAS`. |
| `alertas_enviadas` | `int`           | Contador de alertas ya enviadas (0, 1, 2…)                      | Controlar cuántas alertas se han enviado para evitar spam.            |

### 2.3 Propiedad calculada: `dias_para_vencer`

Calculada en Python como `(vigencia_hasta - date.today()).days`. No es una columna de BD.

**Umbrales sugeridos para alertas:**

| Días restantes | Acción                              | Prioridad    |
|----------------|-------------------------------------|--------------|
| 90 días        | Alerta preventiva (primera)         | Informativa  |
| 30 días        | Alerta de acción requerida          | Media        |
| 15 días        | Alerta crítica — renovación urgente | Alta         |
| 0 o negativo   | Póliza vencida — escalamiento       | Crítica      |

### 2.4 Contacto del contratista (para notificación)

> Estos campos provienen del modelo `Contratista` relacionado (`poliza.contratista`).

| Campo                    | Tipo  | Descripción                                      |
|--------------------------|-------|--------------------------------------------------|
| `contratista.email`      | `str` | Correo del contratista al que se notifica.       |
| `contratista.telefono`   | `str` | Teléfono del contratista (para SMS/WhatsApp).    |
| `contratista.nombre_razon_social` | `str` | Nombre para el saludo en el correo.  |

### 2.5 Identificación y referencia

| Campo              | Tipo  | Descripción                                                  |
|--------------------|-------|--------------------------------------------------------------|
| `numero_poliza`    | `str` | Identificador de la póliza en el correo/notificación.        |
| `numero_contrato`  | `str` | Referencia contractual para contextualizar la alerta.        |
| `tipo`             | `TipoPoliza` | Tipo de garantía (Cumplimiento, RCE, etc.).           |
| `notas_internas`   | `str` | Observaciones del área jurídica relevantes para la alerta.   |

### 2.6 Auditoría (para trazabilidad de alertas)

| Campo           | Tipo       | Descripción                                              |
|-----------------|------------|----------------------------------------------------------|
| `modificado_por`| `str`      | Usuario que realizó el último cambio (para logs de auditoría). |
| `updated_at`    | `datetime` | Timestamp del último cambio para detectar actualizaciones recientes. |

---

## 3. Campos en `Corredor` relevantes para el motor de alertas

El corredor debe ser notificado en paralelo con el contratista para que gestione la renovación.

| Campo                  | Tipo  | Descripción                                                       |
|------------------------|-------|-------------------------------------------------------------------|
| `email_principal`      | `str` | **Destinatario principal** para la notificación al corredor.      |
| `email_ayudante`       | `str` | **CC** en el correo de alerta (si existe).                        |
| `telefono_principal`   | `str` | Teléfono del corredor (para SMS/WhatsApp si se implementa).       |
| `telefono_ayudante`    | `str` | Teléfono del ayudante (canal secundario).                         |
| `nombre_corredor`      | `str` | Nombre para el saludo en el correo.                               |
| `empresa`              | `str` | Razón social para la firma del correo.                            |
| `activo`               | `bool`| Solo notificar corredor si `activo == True`.                      |
| `modificado_por`       | `str` | Auditoría: último usuario que modificó el registro del corredor.  |

---

## 4. Consulta SQL sugerida para el motor de alertas

```sql
-- Pólizas que requieren alerta de vencimiento
SELECT
    p.id,
    p.numero_poliza,
    p.numero_contrato,
    p.tipo,
    p.vigencia_hasta,
    p.estado,
    p.alertas_enviadas,
    (p.vigencia_hasta - CURRENT_DATE) AS dias_para_vencer,
    -- Contratista
    ct.nombre_razon_social  AS contratista_nombre,
    ct.email                AS contratista_email,
    ct.telefono             AS contratista_telefono,
    -- Corredor
    cr.nombre_corredor      AS corredor_nombre,
    cr.empresa              AS corredor_empresa,
    cr.email_principal      AS corredor_email,
    cr.email_ayudante       AS corredor_email_ayudante,
    cr.telefono_principal   AS corredor_telefono
FROM polizas p
JOIN contratistas ct ON ct.id = p.contratista_id
LEFT JOIN corredores cr ON cr.id = p.corredor_id AND cr.activo = TRUE
WHERE
    p.estado IN ('ACTIVA', 'POR_VENCER')
    AND (p.vigencia_hasta - CURRENT_DATE) IN (90, 30, 15)
    AND p.alertas_enviadas < 3
ORDER BY dias_para_vencer ASC;
```

---

## 5. Modelo de payload para el servicio de notificación

El motor de alertas deberá construir el siguiente payload JSON para cada póliza elegible:

```json
{
  "poliza_id": 42,
  "numero_poliza": "CU-2025-001234",
  "tipo_alerta": "VENCIMIENTO_30_DIAS",
  "dias_para_vencer": 30,
  "vigencia_hasta": "2025-07-09",
  "destinatarios": [
    {
      "tipo": "CONTRATISTA",
      "nombre": "Constructora XYZ S.A.S",
      "email": "contacto@xyz.com",
      "telefono": "3001234567",
      "es_copia": false
    },
    {
      "tipo": "CORREDOR",
      "nombre": "Sergio Trujillo",
      "empresa": "Vision Integral Asesores",
      "email": "sergio.trujillo@visionasesores.com",
      "telefono": "3156051926",
      "es_copia": false
    },
    {
      "tipo": "CORREDOR_AYUDANTE",
      "nombre": "Nathaly Barragán",
      "email": "nathaly.barragan@visionasesores.com",
      "telefono": "3196807682",
      "es_copia": true
    }
  ],
  "metadatos": {
    "numero_contrato": "IDEXUD-2025-0001",
    "tipo_garantia": "CUMPLIMIENTO",
    "alertas_previas_enviadas": 1
  }
}
```

---

## 6. Campos que el sistema DEBE persistir tras cada alerta enviada

| Campo en `Poliza`  | Acción                                           |
|--------------------|--------------------------------------------------|
| `alertas_enviadas` | Incrementar en 1 por cada alerta enviada.        |
| `estado`           | Si `dias_para_vencer <= 30`: cambiar a `POR_VENCER`. Si `dias_para_vencer < 0`: cambiar a `VENCIDA`. |
| `modificado_por`   | Registrar `"sistema_alertas"` para trazabilidad. |
| `updated_at`       | Actualiza automáticamente por `onupdate=func.now()`. |

---

## 7. Consideraciones para la futura integración con Login

- El campo `modificado_por` en `Poliza` y `Corredor` recibirá el **email del usuario autenticado** (`usuario.email`) una vez que el módulo de autenticación JWT esté activo.
- El modelo `Usuario` (`app/models/usuario.py`) ya define los roles `ADMIN`, `JURIDICA`, `PMO`, `DIRECTOR` que determinarán quién puede modificar registros y quién recibe copias de alertas internas.
- Las alertas internas (a usuarios de IDEXUD) deberán usar `usuario.email` filtrado por rol `JURIDICA` y `DIRECTOR`.

---

## 8. Resumen de dependencias del motor de alertas

```
Motor de Alertas
├── Lee: Poliza.vigencia_hasta, .estado, .alertas_enviadas
├── Lee: Contratista.email, .telefono, .nombre_razon_social
├── Lee: Corredor.email_principal, .email_ayudante, .activo
├── Escribe: Poliza.alertas_enviadas += 1
├── Escribe: Poliza.estado (si corresponde)
└── Escribe: Poliza.modificado_por = "sistema_alertas"
```
