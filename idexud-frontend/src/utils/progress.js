/**
 * Nombres exactos de los campos del checklist (deben coincidir con el modelo backend).
 * Exportados para que PolizaDetail pueda reutilizarlos sin duplicar la lista.
 */
export const CAMPOS_CHECKLIST = [
  'paso1_solicitud_recibida',
  'paso2_docs_verificados',
  'paso3_borrador_revisado',
  'paso4_aprobada_juridica',
  'paso5_emitida_aseguradora',
  'paso6_radicada_idexud',
  'paso7_ingresada_sistema',
  'paso8_supervisor_notificado',
  'paso9_incluida_cartera',
  'paso10_archivada',
];

export const TOTAL_PASOS = CAMPOS_CHECKLIST.length; // 10

/** Color hex según porcentaje para evitar dependencias de clases Tailwind purgadas. */
function colorDesdeProgreso(porcentaje) {
  if (porcentaje === 100) return '#16a34a'; // verde completo
  if (porcentaje >= 60)   return '#f59e0b'; // ámbar medio
  if (porcentaje >= 20)   return '#3b82f6'; // azul iniciando
  return '#d1d5db';                         // gris sin empezar
}

/**
 * Calcula el progreso visual de una póliza.
 *
 * Prioridades:
 *  1. estado === 'RENOVADA'  → 100% siempre.
 *  2. checklist disponible   → (pasos_completados / 10) * 100.
 *  3. Sin checklist          → fallback por estado (usado en la tabla de lista).
 *
 * @param {object} poliza    - objeto póliza (necesita `estado` y opcionalmente `checklist`)
 * @param {object|null} checklist - objeto con campos paso1..paso10; si se omite se intenta
 *                                  leer de poliza.checklist, útil para la vista detalle donde
 *                                  el checklist es estado de React actualizado en vivo.
 * @returns {{ porcentaje: number, colorHex: string, completados: number|null, totalPasos: number }}
 */
export function progresoDeEstado(poliza, checklist = null) {
  const { estado } = poliza ?? {};

  // Regla 1: calcular desde checklist (argumento explícito o embebido en el objeto poliza)
  const chk = checklist ?? poliza?.checklist ?? null;
  if (chk) {
    const completados = CAMPOS_CHECKLIST.filter(campo => !!chk[campo]).length;
    const porcentaje  = Math.round((completados / TOTAL_PASOS) * 100);
    return { porcentaje, colorHex: colorDesdeProgreso(porcentaje), completados, totalPasos: TOTAL_PASOS };
  }

  // Regla 2: fallback por estado cuando el checklist no está disponible
  const MAPA_ESTADO = {
    BORRADOR:           { porcentaje: 10,  colorHex: '#9ca3af' },
    PENDIENTE_REVISION: { porcentaje: 40,  colorHex: '#f59e0b' },
    ACTIVA:             { porcentaje: 70,  colorHex: '#3b82f6' },
    POR_VENCER:         { porcentaje: 80,  colorHex: '#f97316' },
    VENCIDA:            { porcentaje: 90,  colorHex: '#dc2626' },
    RENOVADA:           { porcentaje: 100, colorHex: '#16a34a' },
    ANULADA:            { porcentaje: 0,   colorHex: '#9ca3af' },
  };
  const base = MAPA_ESTADO[estado] ?? { porcentaje: 0, colorHex: '#d1d5db' };
  return { ...base, completados: null, totalPasos: TOTAL_PASOS };
}
