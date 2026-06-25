import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { proyectosApi, siexudApi } from '../../services/api';
import ProyectoDetailModal from '../../components/proyectos/ProyectoDetailModal';
import DashboardHeader from '../../components/layout/DashboardHeader';

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

function formatCOP(valor) {
  if (valor == null) return null;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(valor);
}

function BadgeEstado({ estado }) {
  const map = {
    'EN EJECUCIÓN': { bg: 'bg-green-100',  text: 'text-green-800'  },
    'SUSCRITO':     { bg: 'bg-blue-100',   text: 'text-blue-800'   },
    'TERMINADO':    { bg: 'bg-gray-100',   text: 'text-gray-600'   },
    'SUSPENDIDO':   { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'LIQUIDADO':    { bg: 'bg-purple-100', text: 'text-purple-800' },
  };
  const cls = map[estado] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${cls.bg} ${cls.text}`}>
      {estado ?? '—'}
    </span>
  );
}

const ESTADOS    = ['EN EJECUCIÓN', 'SUSCRITO', 'TERMINADO', 'SUSPENDIDO', 'LIQUIDADO'];
const REGIONES   = ['NACIONAL', 'ANDINA', 'CARIBE', 'PACIFICA', 'ORINOQUIA', 'AMAZONIA', 'INSULAR'];
const ANIO_HOY   = new Date().getFullYear();
const ANIOS      = Array.from({ length: 10 }, (_, i) => ANIO_HOY - i);

// ─────────────────────────────────────────────────────────────────────────────
// Vista principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ProyectosList() {
  const [proyectos, setProyectos]         = useState([]);
  const [total, setTotal]                 = useState(0);
  const [pagina, setPagina]               = useState(1);
  const [paginasTotales, setPaginasTotales] = useState(1);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  const [busqueda, setBusqueda]           = useState('');
  const [filtroAnio, setFiltroAnio]       = useState('');
  const [filtroEstado, setFiltroEstado]   = useState('');
  const [filtroRegion, setFiltroRegion]   = useState('');

  const [sincronizando, setSincronizando] = useState(false);
  const [bannerSync, setBannerSync]       = useState(null);

  const [proyectoModal, setProyectoModal] = useState(null);

  const cargar = useCallback(async (pagActual = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { pagina: pagActual, por_pagina: 50 };
      if (busqueda)     params.busqueda      = busqueda;
      if (filtroAnio)   params.anio          = parseInt(filtroAnio, 10);
      if (filtroEstado) params.estado        = filtroEstado;
      if (filtroRegion) params.region_codigo = filtroRegion;

      const { data } = await proyectosApi.listar(params);
      setProyectos(data.proyectos ?? []);
      setTotal(data.total ?? 0);
      setPaginasTotales(data.paginas_totales ?? 1);
      setPagina(pagActual);
    } catch (err) {
      setError(err.mensajeUsuario ?? 'Error al cargar proyectos.');
    } finally {
      setLoading(false);
    }
  }, [busqueda, filtroAnio, filtroEstado, filtroRegion]);

  useEffect(() => { cargar(1); }, [cargar]);

  const handleSincronizar = async () => {
    setSincronizando(true);
    setBannerSync(null);
    try {
      const { data, status } = await siexudApi.sincronizar();
      const hayErrores = data.errores > 0;
      const hayExito   = (data.creados + data.actualizados) > 0;

      if (status === 207 || (!hayExito && hayErrores)) {
        const detalle = data.primera_excepcion ? ` — ${data.primera_excepcion}` : '';
        setBannerSync({ tipo: 'error', texto: `Sincronización con errores: ${data.errores} proyectos fallaron.${detalle}` });
      } else {
        setBannerSync({
          tipo: 'ok',
          texto: `Sincronización completada: ${data.creados} nuevos, ${data.actualizados} actualizados${hayErrores ? ` (${data.errores} con error)` : ''}.`,
        });
      }
      cargar(1);
    } catch (err) {
      const detalle = err.response?.data?.detail ?? err.mensajeUsuario ?? 'No se pudo conectar con SIEXUD.';
      setBannerSync({ tipo: 'error', texto: detalle });
    } finally {
      setSincronizando(false);
    }
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroAnio('');
    setFiltroEstado('');
    setFiltroRegion('');
  };

  const hayFiltros = busqueda || filtroAnio || filtroEstado || filtroRegion;

  const enEjecucion = useMemo(
    () => proyectos.filter((p) => p.estado === 'EN EJECUCIÓN').length,
    [proyectos]
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <DashboardHeader
        title="Proyectos SIEXUD"
        subtitle="Contratos y proyectos sincronizados desde la fuente institucional OFEX — Universidad Distrital."
        breadcrumb="IDEXUD · Proyectos SIEXUD"
        accent="#22C55E"
        accent2="#0EA5E9"
        stats={[
          { label: 'TOTAL',         value: loading ? null : total,        desc: 'Proyectos en SIEXUD'   },
          { label: 'EN EJECUCIÓN',  value: loading ? null : enEjecucion,  desc: 'Contratos activos (pág. actual)' },
          { label: 'PÁGINA',        value: loading ? null : paginasTotales, desc: 'Páginas de resultados' },
        ]}
      >
        <button
          onClick={handleSincronizar}
          disabled={sincronizando}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border border-white/25 text-white/80 bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} className={sincronizando ? 'animate-spin' : ''} />
          {sincronizando ? 'Sincronizando…' : 'Sincronizar SIEXUD'}
        </button>
      </DashboardHeader>

      <div className="ud-card overflow-hidden">

        {/* ── Banner resultado sync ───────────────────────────────────── */}
        {bannerSync && (
          <div className={`mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm
            ${bannerSync.tipo === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'}`}>
            <span className="flex-1">{bannerSync.texto}</span>
            <button onClick={() => setBannerSync(null)} className="opacity-60 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Filtros en grid ─────────────────────────────────────────── */}
        <div className="px-5 py-4 bg-white border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Búsqueda */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ud-gris-claro pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, código, entidad…"
                className="ud-input pl-8 pr-7 h-9 text-sm w-full"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Año */}
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="ud-input h-9 text-sm cursor-pointer w-full"
            >
              <option value="">Todos los años</option>
              {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="ud-input h-9 text-sm cursor-pointer w-full"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>

            {/* Región */}
            <select
              value={filtroRegion}
              onChange={(e) => setFiltroRegion(e.target.value)}
              className="ud-input h-9 text-sm cursor-pointer w-full"
            >
              <option value="">Todas las regiones</option>
              {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Fila inferior: limpiar + contador */}
          <div className="flex items-center justify-between mt-2.5">
            {hayFiltros ? (
              <button
                onClick={limpiarFiltros}
                className="text-xs text-ud-naranja hover:underline font-medium"
              >
                Limpiar filtros
              </button>
            ) : <span />}
            {!loading && (
              <span className="text-xs text-ud-gris-claro tabular-nums">
                {total} {total === 1 ? 'proyecto' : 'proyectos'}
              </span>
            )}
          </div>
        </div>

        {/* ── Banner de error de carga ─────────────────────────────────── */}
        {error && !loading && (
          <div className="mx-5 mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
            <span className="text-red-500 flex-shrink-0">⚠️</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-red-700">No se pudieron cargar los proyectos</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => cargar(pagina)}
              className="flex-shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ── Tabla ──────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-ud-gris-50">
                {['N° / Código', 'Nombre del Proyecto', 'Entidad Contratante', 'Estado', 'Región', 'Vigente Hasta', 'Valor Vigente'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[10px] font-semibold text-ud-gris-claro uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">

              {/* Skeleton de carga */}
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-20 mb-1" /><div className="h-2.5 bg-gray-50 rounded w-16" /></td>
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-52" /></td>
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-36" /></td>
                  <td className="px-4 py-3.5"><div className="h-5 bg-gray-100 rounded-full w-24" /></td>
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-20" /></td>
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-20" /></td>
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-24" /></td>
                </tr>
              ))}

              {/* Estado vacío */}
              {!loading && !error && proyectos.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="text-4xl mb-3">🏛️</div>
                    <p className="font-semibold text-ud-gris text-sm">
                      {hayFiltros ? 'No se encontraron proyectos con esos filtros' : 'No hay proyectos sincronizados'}
                    </p>
                    <p className="text-xs text-ud-gris-claro mt-1">
                      {hayFiltros ? (
                        <>Intenta con otros criterios o{' '}
                          <button onClick={limpiarFiltros} className="text-ud-naranja hover:underline font-medium">limpia los filtros</button>
                        </>
                      ) : (
                        <>Haz clic en{' '}
                          <button onClick={handleSincronizar} className="text-ud-naranja hover:underline font-medium">"Sincronizar"</button>
                          {' '}para importar los proyectos del SIEXUD.
                        </>
                      )}
                    </p>
                  </td>
                </tr>
              )}

              {/* Filas de datos */}
              {!loading && proyectos.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setProyectoModal(p)}
                  className="group hover:bg-ud-naranja-50/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-xs text-ud-gris tabular-nums group-hover:text-ud-naranja transition-colors">
                      #{p.numero_interno}
                    </p>
                    {p.codigo_contable && (
                      <p className="text-[10px] text-ud-gris-claro font-mono">{p.codigo_contable}</p>
                    )}
                    {p.numero_externo && (
                      <p className="text-[10px] text-ud-gris-claro truncate max-w-[110px]" title={p.numero_externo}>
                        {p.numero_externo}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 max-w-[280px]">
                    <p className="text-sm text-ud-gris leading-snug line-clamp-2 group-hover:text-ud-naranja transition-colors" title={p.nombre}>
                      {p.nombre}
                    </p>
                    {p.anio && <span className="text-[10px] text-ud-gris-claro">{p.anio}</span>}
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px]">
                    <p className="text-xs text-ud-gris leading-snug line-clamp-2" title={p.entidad_contratante}>
                      {p.entidad_contratante ?? <span className="text-gray-300">N/A</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <BadgeEstado estado={p.estado} />
                    {p.prorrogado && (
                      <div className="mt-1">
                        <span className="text-[9px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                          +{p.num_prorrogas}P
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-ud-gris">
                    {p.region_impactada ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-ud-gris tabular-nums">
                    {p.fecha_fin_vigente ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-ud-gris tabular-nums">
                    {formatCOP(p.valor_vigente) ?? <span className="font-normal text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Paginación ─────────────────────────────────────────────────── */}
        {!loading && paginasTotales > 1 && (
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-ud-gris-claro">
              Página {pagina} de {paginasTotales}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => cargar(pagina - 1)}
                disabled={pagina <= 1}
                className="p-1.5 rounded-md border border-gray-200 text-ud-gris disabled:opacity-30 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => cargar(pagina + 1)}
                disabled={pagina >= paginasTotales}
                className="p-1.5 rounded-md border border-gray-200 text-ud-gris disabled:opacity-30 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de detalle ───────────────────────────────────────────────── */}
      <ProyectoDetailModal
        isOpen={proyectoModal !== null}
        onClose={() => setProyectoModal(null)}
        proyecto={proyectoModal}
      />
    </div>
  );
}
