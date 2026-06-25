import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Pencil, Trash2, AlertTriangle, Loader2, ArrowUpDown, X, RefreshCw } from 'lucide-react';
import { usePolizas, usePolizaStats } from '../../hooks/usePolizas';
import { BadgeEstado, BadgeTipo } from '../../components/ui/Badge';
import SolicitudModal from '../../components/polizas/SolicitudModal';
import PolizaModal from '../../components/polizas/PolizaModal';
import { useAuth } from '../../context/AuthContext';
import ExportButton from '../../components/ExportButton';
import { progresoDeEstado } from '../../utils/progress';
import { solicitudesApi, polizasApi, siexudApi } from '../../services/api';
import DashboardHeader from '../../components/layout/DashboardHeader';

function formatCOP(valor) {
  if (valor == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
}

export default function PolizasList() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalPolizaAbierto, setModalPolizaAbierto] = useState(false);
  const [polizaEditar, setPolizaEditar] = useState(null);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [ordenar, setOrdenar] = useState('reciente');

  // ── Modal de confirmación de eliminación ──────────────────────────────────
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [polizaAEliminar, setPolizaAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);

  // ── Sincronización SIEXUD ─────────────────────────────────────────────────
  const [sincronizando, setSincronizando] = useState(false);
  const [bannerSiexud, setBannerSiexud] = useState(null); // { tipo: 'ok'|'error', texto: '' }

  const handleSincronizar = useCallback(async () => {
    setSincronizando(true);
    setBannerSiexud(null);
    try {
      const { data, status } = await siexudApi.sincronizar();
      const hayErrores = data.errores > 0;
      const hayExito   = (data.creados + data.actualizados) > 0;

      if (status === 207 || (!hayExito && hayErrores)) {
        const detalle = data.primera_excepcion ? ` — ${data.primera_excepcion}` : '';
        setBannerSiexud({
          tipo: 'error',
          texto: `Sincronización con errores: ${data.errores} fallaron, ${data.creados} creados.${detalle}`,
        });
      } else {
        setBannerSiexud({
          tipo: 'ok',
          texto: `SIEXUD sincronizado: ${data.creados} nuevos, ${data.actualizados} actualizados.`,
        });
      }
    } catch (err) {
      const detalle = err.response?.data?.detail ?? err.mensajeUsuario ?? 'No se pudo conectar con SIEXUD.';
      setBannerSiexud({ tipo: 'error', texto: detalle });
    } finally {
      setSincronizando(false);
    }
  }, []);

  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { polizas, loading, error, filtros, setFiltros, refetch } = usePolizas();
  const { stats: pStats, refetch: refetchStats } = usePolizaStats();
  const esAdmin = usuario?.rol === 'ADMIN';

  // Refresca tanto la tabla como las tarjetas de resumen
  const refetchTodo = useCallback(() => {
    refetch();
    refetchStats();
  }, [refetch, refetchStats]);

  const headerStats = [
    { label: 'TOTAL',      value: pStats?.total_polizas, desc: 'Pólizas en el sistema' },
    { label: 'ACTIVAS',    value: pStats?.activas,        desc: 'vigencia_hasta ≥ hoy'  },
    { label: 'POR VENCER', value: pStats?.por_vencer,     desc: 'Próximas 30 días'      },
    { label: 'VENCIDAS',   value: pStats?.vencidas,       desc: 'Requieren renovación'  },
  ];

  const aplicarBusqueda = useCallback((valor) => {
    setBusquedaLocal(valor);
    setTimeout(() => { setFiltros({ ...filtros, busqueda: valor || undefined }); }, 350);
  }, [filtros, setFiltros]);

  const handleEditar = useCallback((e, poliza) => {
    e.stopPropagation();
    setPolizaEditar(poliza);
    setModalPolizaAbierto(true);
  }, []);

  // Abre el modal de confirmación (no hace la llamada aún)
  const handleEliminar = useCallback((e, poliza) => {
    e.stopPropagation();
    setPolizaAEliminar(poliza);
    setErrorEliminar(null);
    setModalEliminarAbierto(true);
  }, []);

  // Ejecuta el borrado físico tras confirmar en el modal
  const confirmarEliminacion = async () => {
    if (!polizaAEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await polizasApi.eliminar(polizaAEliminar.id);
      setModalEliminarAbierto(false);
      setPolizaAEliminar(null);
      refetchTodo();
    } catch (err) {
      setErrorEliminar(err.mensajeUsuario ?? 'No se pudo eliminar la póliza. Intente de nuevo.');
    } finally {
      setEliminando(false);
    }
  };

  const cancelarEliminacion = () => {
    if (eliminando) return;
    setModalEliminarAbierto(false);
    setPolizaAEliminar(null);
    setErrorEliminar(null);
  };

  // ── Ordenamiento client-side sobre los datos ya cargados ─────────────────
  const polizasOrdenadas = useMemo(() => {
    return [...polizas].sort((a, b) => {
      switch (ordenar) {
        case 'antigua':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'valor':
          return (Number(b.valor_asegurado) || 0) - (Number(a.valor_asegurado) || 0);
        case 'progreso': {
          const pa = progresoDeEstado(a, a.checklist ?? null).porcentaje;
          const pb = progresoDeEstado(b, b.checklist ?? null).porcentaje;
          return pb - pa;
        }
        case 'reciente':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });
  }, [polizas, ordenar]);

  return (
    <div className="space-y-5 animate-fade-in">
      <DashboardHeader
        title="Gestión de Pólizas"
        subtitle="Registro y seguimiento de garantías contractuales de la Universidad Distrital."
        breadcrumb="IDEXUD · Área Jurídica"
        accent="#CC6628"
        accent2="#dc2626"
        stats={headerStats}
      >
        {(usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR') && (
          <button
            onClick={handleSincronizar}
            disabled={sincronizando}
            title="Sincronizar proyectos desde SIEXUD (OFEX UD)"
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border border-white/25 text-white/80 bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Sincronizando…' : 'Sincronizar SIEXUD'}
          </button>
        )}
        {(usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR') && (
          <ExportButton endpoint="http://localhost:8000/api/v1/reportes/excel" />
        )}
        {(usuario?.rol === 'PMO' || usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR') && (
          <button onClick={() => setModalAbierto(true)} className="btn-primary bg-blue-600 hover:bg-blue-700 h-9">
            <Plus size={15} /> Nueva Solicitud (PMO)
          </button>
        )}
        {(usuario?.rol === 'JURIDICA' || usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR') && (
          <button onClick={() => setModalPolizaAbierto(true)} className="btn-primary bg-ud-naranja hover:bg-ud-naranja-dark h-9">
            <FileText size={15} /> Registrar Póliza (Jurídica)
          </button>
        )}
      </DashboardHeader>

      <div className="ud-card overflow-hidden">

        {/* ── Banner resultado de sincronización SIEXUD ────────────────────── */}
        {bannerSiexud && (
          <div
            className={`mx-5 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm
              ${bannerSiexud.tipo === 'ok'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'}`}
          >
            <span className="flex-1">{bannerSiexud.texto}</span>
            <button
              onClick={() => setBannerSiexud(null)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Barra de filtros y ordenamiento ──────────────────────────────── */}
        <div className="px-5 py-3 bg-white border-b border-gray-100 flex flex-wrap items-center gap-3">
          {/* Búsqueda por número de póliza o entidad */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ud-gris-claro pointer-events-none" />
            <input
              type="text"
              value={busquedaLocal}
              onChange={(e) => aplicarBusqueda(e.target.value)}
              placeholder="N.º póliza o entidad…"
              className="ud-input pl-8 pr-7 h-8 text-sm w-full"
            />
            {busquedaLocal && (
              <button
                onClick={() => aplicarBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Ordenar */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ArrowUpDown size={13} className="text-ud-gris-claro flex-shrink-0" />
            <select
              value={ordenar}
              onChange={(e) => setOrdenar(e.target.value)}
              className="ud-input h-8 text-sm cursor-pointer min-w-[190px]"
            >
              <option value="reciente">Más reciente</option>
              <option value="antigua">Más antigua</option>
              <option value="valor">Valor (Mayor a menor)</option>
              <option value="progreso">Progreso (Checklist)</option>
            </select>
          </div>

          {/* Contador de resultados */}
          {!loading && (
            <span className="text-xs text-ud-gris-claro ml-auto tabular-nums">
              {polizasOrdenadas.length}{' '}
              {polizasOrdenadas.length === 1 ? 'póliza' : 'pólizas'}
            </span>
          )}
        </div>

        {/* Banner de error de conexión */}
        {error && !loading && (
          <div className="mx-5 mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
            <span className="text-red-500 text-base flex-shrink-0">⚠️</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-red-700">No se pudo conectar con el backend</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
              <p className="text-xs text-red-400 mt-1">
                Verifica que el backend esté activo y que hayas ejecutado{' '}
                <code className="font-mono bg-red-100 px-1 rounded">alembic upgrade head</code>
              </p>
            </div>
            <button onClick={refetch}
              className="flex-shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 underline ml-auto">
              Reintentar
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-ud-gris-50">
                {['Número / Proyecto', 'Tipo', 'Contratista', 'Vigencia Hasta', 'Valor', 'Estado', 'Progreso', ...(esAdmin ? ['Acciones'] : [])].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-[10px] font-semibold text-ud-gris-claro uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Skeleton de carga */}
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-32 mb-1" /><div className="h-2.5 bg-gray-50 rounded w-24" /></td>
                  <td className="px-4 py-3.5"><div className="h-5 bg-gray-100 rounded-full w-20" /></td>
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-28" /></td>
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-20" /></td>
                  <td className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-24" /></td>
                  <td className="px-4 py-3.5"><div className="h-5 bg-gray-100 rounded-full w-16" /></td>
                  <td className="px-4 py-3.5"><div className="h-2 bg-gray-100 rounded-full w-full" /></td>
                  {esAdmin && <td className="px-4 py-3.5"><div className="h-5 bg-gray-100 rounded w-16" /></td>}
                </tr>
              ))}

              {/* Sin datos — sin pólizas en la BD */}
              {!loading && !error && polizas.length === 0 && (
                <tr>
                  <td colSpan={esAdmin ? 8 : 7} className="py-16 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="font-semibold text-ud-gris text-sm">No hay pólizas registradas</p>
                    <p className="text-xs text-ud-gris-claro mt-1">
                      Use <strong>Sembrar demo</strong> en el formulario o registre una póliza nueva.
                    </p>
                  </td>
                </tr>
              )}

              {/* Sin resultados — hay pólizas pero el filtro no coincide */}
              {!loading && !error && polizas.length > 0 && polizasOrdenadas.length === 0 && (
                <tr>
                  <td colSpan={esAdmin ? 8 : 7} className="py-16 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="font-semibold text-ud-gris text-sm">No se encontraron pólizas que coincidan con la búsqueda</p>
                    <p className="text-xs text-ud-gris-claro mt-1">
                      Intenta con un número de póliza o nombre de entidad diferente.
                    </p>
                    <button
                      onClick={() => aplicarBusqueda('')}
                      className="mt-3 text-xs text-ud-naranja hover:underline font-medium"
                    >
                      Limpiar búsqueda
                    </button>
                  </td>
                </tr>
              )}

              {/* Filas de datos */}
              {!loading && polizasOrdenadas.map((p) => {
                const { porcentaje, colorHex, completados, totalPasos } = progresoDeEstado(p, p.checklist ?? null);
                return (
                  <tr key={p.id} className="group hover:bg-ud-naranja-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/polizas/${p.id}`)}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-sm text-ud-gris group-hover:text-ud-naranja">{p.numero_poliza || 'PENDIENTE'}</p>
                      <p className="text-[10px] text-ud-gris-claro">CC: {p.centro_costo_solicitante || '---'}</p>
                    </td>
                    <td className="px-4 py-3.5"><BadgeTipo tipo={p.tipo} /></td>
                    <td className="px-4 py-3.5 text-sm text-ud-gris truncate max-w-[150px]">{p.contratista?.nombre_razon_social || '---'}</td>
                    <td className="px-4 py-3.5 text-sm text-ud-gris">{p.vigencia_hasta_fmt || '---'}</td>
                    <td className="px-4 py-3.5 font-semibold text-sm text-ud-gris">{formatCOP(p.valor_asegurado)}</td>
                    <td className="px-4 py-3.5"><BadgeEstado estado={p.estado} /></td>
                    <td className="px-4 py-3.5 w-28">
                      <div title={completados !== null ? `${completados} de ${totalPasos} pasos completados` : `Estado: ${p.estado}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${porcentaje}%`, backgroundColor: colorHex }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 w-7 text-right flex-shrink-0">{porcentaje}%</span>
                        </div>
                        {completados !== null && (
                          <p className="text-[9px] text-gray-400 text-right pr-9">{completados}/{totalPasos} pasos</p>
                        )}
                      </div>
                    </td>
                    {esAdmin && (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleEditar(e, p)}
                            title="Editar póliza"
                            className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => handleEliminar(e, p)}
                            title="Eliminar póliza"
                            className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SolicitudModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSubmit={async (data) => {
          const { data: responseData } = await solicitudesApi.crear(data);
          refetchTodo();
          return responseData;
        }}
      />
      <PolizaModal
        abierto={modalPolizaAbierto}
        onCerrar={() => { setModalPolizaAbierto(false); setPolizaEditar(null); }}
        onSuccess={refetchTodo}
        polizaEditar={polizaEditar}
      />

      {/* ── Modal de confirmación de eliminación ────────────────────────────── */}
      {modalEliminarAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
          onClick={cancelarEliminacion}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícono de advertencia */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
            </div>

            {/* Título */}
            <h3 className="font-titular font-semibold text-ud-gris text-lg text-center mb-2">
              ¿Confirmar eliminación?
            </h3>

            {/* Descripción */}
            <p className="font-texto text-sm text-ud-gris-claro text-center leading-relaxed mb-1">
              Esta acción no se puede deshacer. La póliza
            </p>
            <p className="font-mono font-semibold text-ud-gris text-center text-sm mb-1">
              {polizaAEliminar?.numero_poliza}
            </p>
            <p className="font-texto text-sm text-ud-gris-claro text-center leading-relaxed mb-5">
              será eliminada permanentemente del sistema, incluyendo su checklist y alertas asociadas.
            </p>

            {/* Error de API */}
            {errorEliminar && (
              <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 mb-4">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="font-texto text-xs text-red-600">{errorEliminar}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelarEliminacion}
                disabled={eliminando}
                className="px-4 py-2 rounded-lg font-texto text-sm font-medium
                           text-ud-gris bg-gray-100 hover:bg-gray-200
                           disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminacion}
                disabled={eliminando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-texto text-sm font-semibold
                           text-white bg-red-600 hover:bg-red-700
                           disabled:opacity-60 transition-colors min-w-[120px] justify-center"
              >
                {eliminando ? (
                  <><Loader2 size={14} className="animate-spin" /> Eliminando…</>
                ) : (
                  <><Trash2 size={14} /> Sí, Eliminar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
