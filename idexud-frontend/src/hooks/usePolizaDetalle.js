/**
 * src/hooks/usePolizaDetalle.js
 * ==============================
 * Hook para la página de detalle de una póliza.
 * Carga GET /polizas/{id} (con relaciones) y gestiona el estado del checklist.
 */
import { useState, useEffect, useCallback } from 'react';
import { polizasApi, checklistApi } from '../services/api';

export function usePolizaDetalle(polizaId) {
  const [poliza,  setPoliza]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchPoliza = useCallback(async () => {
    if (!polizaId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await polizasApi.obtener(polizaId);
      setPoliza(data);
    } catch (err) {
      setError(err.mensajeUsuario ?? 'Error al cargar la póliza.');
    } finally {
      setLoading(false);
    }
  }, [polizaId]);

  useEffect(() => { fetchPoliza(); }, [fetchPoliza]);

  return { poliza, loading, error, refetch: fetchPoliza };
}

export function useChecklist(polizaId) {
  const [checklist,    setChecklist]    = useState(null);
  const [guardando,    setGuardando]    = useState(null);  // campo actualmente guardando
  const [errorChecklist, setErrorChecklist] = useState(null);

  const fetchChecklist = useCallback(async () => {
    if (!polizaId) return;
    try {
      const { data } = await checklistApi.obtener(polizaId);
      setChecklist(data);
    } catch { /* se usa el checklist embebido en poliza */ }
  }, [polizaId]);

  // Marcar/desmarcar un paso — actualización optimista
  const togglePaso = useCallback(async (campo, valorActual, responsable) => {
    const nuevoValor = !valorActual;
    setErrorChecklist(null);
    setGuardando(campo);

    // Optimista: actualizar UI inmediatamente
    setChecklist((prev) => prev
      ? { ...prev, [campo]: nuevoValor }
      : prev
    );

    try {
      const { data } = await checklistApi.actualizar(polizaId, {
        [campo]: nuevoValor,
        ...(responsable && nuevoValor
          ? { [`${campo.replace(/paso\d+_\w+/, '')}responsable`]: responsable }
          : {}),
      });
      setChecklist(data);   // reemplazar con respuesta real del server
    } catch (err) {
      // Revertir en caso de error
      setChecklist((prev) => prev ? { ...prev, [campo]: valorActual } : prev);
      setErrorChecklist(err.mensajeUsuario ?? 'Error al guardar. Intente de nuevo.');
    } finally {
      setGuardando(null);
    }
  }, [polizaId]);

  return { checklist, guardando, errorChecklist, setChecklist, togglePaso, fetchChecklist };
}
