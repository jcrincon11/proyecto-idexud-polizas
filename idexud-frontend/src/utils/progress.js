const MAPA_PROGRESO = {
  BORRADOR:           { porcentaje: 15,  colorBarra: 'bg-estado-borrador' },
  PENDIENTE_REVISION: { porcentaje: 40,  colorBarra: 'bg-amber-500'       },
  ACTIVA:             { porcentaje: 100, colorBarra: 'bg-estado-activa'   },
  POR_VENCER:         { porcentaje: 75,  colorBarra: 'bg-estado-vencer'   },
  VENCIDA:            { porcentaje: 100, colorBarra: 'bg-estado-vencida'  },
  RENOVADA:           { porcentaje: 100, colorBarra: 'bg-estado-renovada' },
  ANULADA:            { porcentaje: 0,   colorBarra: 'bg-estado-anulada'  },
};

const FALLBACK = { porcentaje: 0, colorBarra: 'bg-gray-300' };

export function progresoDeEstado(estado) {
  return MAPA_PROGRESO[estado] ?? FALLBACK;
}
