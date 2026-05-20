/**
 * src/hooks/useEntidades.js
 * Carga aseguradoras y contratistas para los selects del formulario.
 */
import { useState, useEffect } from 'react';
import { aseguradorasApi, contratistasApi } from '../services/api';

export function useAseguradoras() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aseguradorasApi.listar()
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]))
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
