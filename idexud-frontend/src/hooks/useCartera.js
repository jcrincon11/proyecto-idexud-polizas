/**
 * src/hooks/useCartera.js
 * ========================
 * Hook de datos para el módulo de Cartera.
 *
 * ┌─ Para activar la API real: cambiar la línea de abajo ──────────────────┐
 * │   const USE_MOCK = false;                                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Con USE_MOCK = true  → opera sobre datos locales, sin red.
 * Con USE_MOCK = false → llama a carteraApi (GET /cartera/, PATCH /cartera/:id).
 *
 * Contrato del hook:
 *   const { cartera, loading, error, actualizarRegistro, refetch } = useCartera();
 *
 *   cartera           → EntradaCartera[]   lista actual (mock o API)
 *   loading           → boolean            true mientras carga/recarga
 *   error             → string | null      mensaje de error listo para mostrar
 *   actualizarRegistro(id, cambios) → Promise<void>
 *   refetch()         → Promise<void>      fuerza una recarga completa
 */

import { useState, useCallback, useEffect } from 'react';
import { carteraApi } from '../services/api';

// ─── BANDERA DE MODO ──────────────────────────────────────────────────────────
// Cambiar a false para conectar la API real.
const USE_MOCK = true;

// ─── DATOS ESTÁTICOS DE DEMO ──────────────────────────────────────────────────
// Se usan únicamente cuando USE_MOCK = true.
// La estructura replica exactamente la respuesta esperada del endpoint real
// GET /cartera/, de modo que el componente no necesita adaptarse al cambiar.
const MOCK_CARTERA = [
  {
    id: 1,
    aseguradora: 'Seguros Bolívar',
    numero_poliza: 'POL-2024-00142',
    centro_costo_solicitante: 'CC-310 · Rectoría',
    centro_costo_pagador: 'CC-001 · IDEXUD',
    estado_cartera: 'PENDIENTE_REINTEGRO',
    orden_pago_numero: '',
    orden_pago_fecha: '',
    enlace_soporte_pago: '',
    valor_poliza: 18_500_000,
  },
  {
    id: 2,
    aseguradora: 'Mapfre Colombia',
    numero_poliza: 'POL-2024-00089',
    centro_costo_solicitante: 'CC-420 · Facultad de Ingeniería',
    centro_costo_pagador: 'CC-001 · IDEXUD',
    estado_cartera: 'ABONADO',
    orden_pago_numero: 'OP-2024-0531',
    orden_pago_fecha: '2024-09-15',
    enlace_soporte_pago: 'https://nextcloud.udistrital.edu.co/s/aBcDeFg',
    valor_poliza: 7_200_000,
  },
  {
    id: 3,
    aseguradora: 'La Equidad Seguros',
    numero_poliza: 'POL-2023-00377',
    centro_costo_solicitante: 'CC-215 · Ciencias y Educación',
    centro_costo_pagador: 'CC-001 · IDEXUD',
    estado_cartera: 'PAGADO',
    orden_pago_numero: 'OP-2023-1102',
    orden_pago_fecha: '2023-11-28',
    enlace_soporte_pago: 'https://nextcloud.udistrital.edu.co/s/xYzWvU',
    valor_poliza: 34_000_000,
  },
  {
    id: 4,
    aseguradora: 'Seguros del Estado',
    numero_poliza: 'POL-2024-00201',
    centro_costo_solicitante: 'CC-512 · Tecnológica',
    centro_costo_pagador: 'CC-001 · IDEXUD',
    estado_cartera: 'PENDIENTE_REINTEGRO',
    orden_pago_numero: '',
    orden_pago_fecha: '',
    enlace_soporte_pago: '',
    valor_poliza: 11_750_000,
  },
  {
    id: 5,
    aseguradora: 'Positiva Compañía de Seguros',
    numero_poliza: 'POL-2024-00055',
    centro_costo_solicitante: 'CC-318 · Medio Ambiente',
    centro_costo_pagador: 'CC-001 · IDEXUD',
    estado_cartera: 'ABONADO',
    orden_pago_numero: 'OP-2024-0219',
    orden_pago_fecha: '2024-04-02',
    enlace_soporte_pago: 'https://nextcloud.udistrital.edu.co/s/pQrStU',
    valor_poliza: 5_600_000,
  },
  {
    id: 6,
    aseguradora: 'Allianz Colombia',
    numero_poliza: 'POL-2023-00490',
    centro_costo_solicitante: 'CC-601 · Artes ASAB',
    centro_costo_pagador: 'CC-001 · IDEXUD',
    estado_cartera: 'PAGADO',
    orden_pago_numero: 'OP-2023-0887',
    orden_pago_fecha: '2023-08-10',
    enlace_soporte_pago: 'https://nextcloud.udistrital.edu.co/s/mNoPqR',
    valor_poliza: 9_300_000,
  },
];

// ─── HELPER INTERNO ───────────────────────────────────────────────────────────
// Simula la latencia de red para que el mock sea indistinguible en UX
// de una llamada real. Se elimina automáticamente cuando USE_MOCK = false.
const simularRed = (ms = 350) => new Promise((res) => setTimeout(res, ms));

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useCartera() {
  const [cartera, setCartera]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  // ── Carga inicial / refetch ──────────────────────────────────────────────
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK) {
        await simularRed();
        setCartera(MOCK_CARTERA);
      } else {
        // La API devuelve { items: [...], total: N } igual que /polizas/
        const { data } = await carteraApi.listar();
        setCartera(data.items ?? data);
      }
    } catch (err) {
      setError(err.mensajeUsuario ?? 'No se pudieron cargar los registros de cartera.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // ── Actualización parcial de un registro ────────────────────────────────
  //
  // En modo mock: actualiza el array local con los cambios recibidos,
  //   simulando lo que haría el servidor.
  // En modo real: hace PATCH /cartera/:id y reemplaza el registro con
  //   la respuesta del servidor (fuente de verdad).
  //
  // Parámetros:
  //   id      → number          ID del registro a actualizar
  //   cambios → Partial<Entrada> solo los campos que cambiaron
  //
  // Devuelve la entrada actualizada (útil para actualizar el modal/estado local).
  const actualizarRegistro = useCallback(async (id, cambios) => {
    if (USE_MOCK) {
      await simularRed(250);
      setCartera((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...cambios } : p))
      );
      // Devolver el objeto actualizado para que el componente pueda usarlo
      return cartera.find((p) => p.id === id) ?? {};
    }

    const { data: actualizado } = await carteraApi.actualizar(id, cambios);
    setCartera((prev) =>
      prev.map((p) => (p.id === id ? actualizado : p))
    );
    return actualizado;
  }, [cartera]);

  return { cartera, loading, error, actualizarRegistro, refetch };
}
