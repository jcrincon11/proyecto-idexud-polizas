/**
 * src/hooks/useEntidades.js
 * Carga aseguradoras y contratistas para los selects del formulario.
 */
import { useState, useEffect } from 'react';
import { aseguradorasApi, contratistasApi, corredoresApi } from '../services/api';

export function useAseguradoras() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aseguradorasApi.listar()
      .then(({ data }) => setItems(data))
      .catch((err) => {
        console.error('[useAseguradoras] Error al cargar:', err?.response?.status, err?.mensajeUsuario ?? err?.message);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { aseguradoras: items, loading };
}

export function useContratistas() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contratistasApi.listar()
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return { contratistas: items, loading };
}

export function useCorredores() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    corredoresApi.listar()
      .then(({ data }) => setItems(data))
      .catch((err) => setError(err.mensajeUsuario ?? 'Error al cargar corredores.'))
      .finally(() => setLoading(false));
  }, []);

  return { corredores: items, loading, error };
}
