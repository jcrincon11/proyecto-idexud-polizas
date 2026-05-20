/**
 * src/components/ui/Badge.jsx
 * ============================
 * Badges semaforizados para estados de póliza y tipos.
 * Las clases CSS base están definidas en src/index.css (.badge-*)
 */

// Mapa de estado → clase CSS + etiqueta legible
const CONFIG_ESTADO = {
  ACTIVA:             { clase: 'badge-activa',     label: 'Activa',              punto: 'bg-estado-activa' },
  POR_VENCER:         { clase: 'badge-por-vencer', label: 'Por Vencer',          punto: 'bg-estado-vencer' },
  VENCIDA:            { clase: 'badge-vencida',    label: 'Vencida',             punto: 'bg-estado-vencida' },
  BORRADOR:           { clase: 'badge-borrador',   label: 'Borrador',            punto: 'bg-estado-borrador' },
  PENDIENTE_REVISION: { clase: 'badge-borrador',   label: 'Pendiente Revisión',  punto: 'bg-estado-borrador' },
  RENOVADA:           { clase: 'badge-renovada',   label: 'Renovada',            punto: 'bg-estado-renovada' },
  ANULADA:            { clase: 'badge-anulada',    label: 'Anulada',             punto: 'bg-estado-anulada' },
};

const ETIQUETAS_TIPO = {
  CUMPLIMIENTO:         'Cumplimiento',
  RCE:                  'RCE',
  CALIDAD_SERVICIO:     'Cal. Servicio',
  PAGO_SALARIOS:        'Pago Salarios',
  ESTABILIDAD_OBRA:     'Est. Obra',
  CORRECTO_MANEJO:      'Cto. Manejo',
  RESPONSABILIDAD_CIVIL:'Resp. Civil',
  OTRO:                 'Otro',
};

/**
 * Badge de estado de póliza con punto de color animado.
 */
export function BadgeEstado({ estado }) {
  const config = CONFIG_ESTADO[estado] ?? CONFIG_ESTADO.BORRADOR;
  return (
    <span className={`${config.clase} flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.punto} flex-shrink-0`} />
      {config.label}
    </span>
  );
}

/**
 * Badge de tipo de póliza (neutro, solo texto).
 */
export function BadgeTipo({ tipo }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                     font-texto font-medium bg-ud-gris-100 text-ud-gris">
      {ETIQUETAS_TIPO[tipo] ?? tipo}
    </span>
  );
}

/**
 * Badge de nivel de alerta (semáforo de días restantes).
 */
export function BadgeAlerta({ nivel, dias }) {
  const configs = {
    rojo:     { bg: 'bg-estado-vencida-bg', text: 'text-estado-vencida', icono: '!' },
    naranja:  { bg: 'bg-estado-vencer-bg',  text: 'text-estado-vencer',  icono: '⚠' },
    amarillo: { bg: 'bg-yellow-50',         text: 'text-yellow-700',     icono: '~' },
    verde:    { bg: 'bg-estado-activa-bg',  text: 'text-estado-activa',  icono: '✓' },
    gris:     { bg: 'bg-estado-borrador-bg',text: 'text-estado-borrador',icono: '—' },
  };
  const c = configs[nivel] ?? configs.gris;
  const texto = dias < 0 ? 'Vencida' : dias === 0 ? 'Hoy' : `${dias}d`;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      text-xs font-texto font-semibold ${c.bg} ${c.text}`}>
      <span className="text-[10px]">{c.icono}</span>
      {texto}
    </span>
  );
}
