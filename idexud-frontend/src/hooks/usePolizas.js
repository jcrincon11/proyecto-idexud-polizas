import { useState, useEffect, useCallback, useRef } from 'react';
import { polizasApi } from '../services/api';

const POR_PAGINA = 20;

export function usePolizas(filtrosIniciales = {}) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [pagina,  setPagina]  = useState(1);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const abortRef = useRef(null);

  const fetchPolizas = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = {
        pagina,
        por_pagina: POR_PAGINA,
        ...(filtros.estado         && { estado:              filtros.estado }),
        ...(filtros.tipo           && { tipo:                filtros.tipo }),
        ...(filtros.busqueda       && { busqueda:            filtros.busqueda }),
        ...(filtros.por_vencer_dias != null && { solo_por_vencer_dias: filtros.por_vencer_dias }),
      };
      const { data: resultado } = await polizasApi.listar(params);
      setData(resultado);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      setError(err.mensajeUsuario ?? 'Error al cargar las pólizas.');
    } finally {
      setLoading(false);
    }
  }, [pagina, filtros]);

  useEffect(() => {
    fetchPolizas();
    return () => abortRef.current?.abort();
  }, [fetchPolizas]);

  const setFiltrosYReset = useCallback((nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    setPagina(1);
  }, []);

  return {
    polizas:   data?.items  ?? [],
    total:     data?.total  ?? 0,
    paginas:   data?.paginas ?? 0,
    porPagina: POR_PAGINA,
    loading, error, pagina, setPagina,
    filtros, setFiltros: setFiltrosYReset,
    refetch: fetchPolizas,
  };
}

export function usePolizaStats() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    polizasApi.stats()
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);
  return { stats, loading };
}
