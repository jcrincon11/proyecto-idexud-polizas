import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ShieldCheck, Wallet, AlertTriangle, FileText, Plus, ChevronRight } from 'lucide-react';
import { polizasApi, carteraApi, solicitudesApi } from '@/services/api';
import SolicitudDetailModal from '@/components/solicitudes/SolicitudDetailModal';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatCOP = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0);

const formatMillones = (v) => {
  if (v == null || v === 0) return '$ 0';
  if (v >= 1_000_000_000) return `$ ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$ ${(v / 1_000).toFixed(0)}K`;
  return formatCOP(v);
};

function diasRestantes(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fecha + 'T00:00:00');
  return Math.ceil((vence - hoy) / 86_400_000);
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, valor, sub, colorBg, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorBg}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        {loading
          ? <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-1" />
          : <p className="text-2xl font-bold text-gray-800 mt-0.5">{valor}</p>
        }
        {sub && !loading && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────

function TooltipCOP({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-lg px-4 py-2.5 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-gray-600">{formatCOP(payload[0]?.value)}</p>
    </div>
  );
}

// ─── SKELETON ────────────────────────────────────────────────────────────────

function SkeletonFila({ cols = 4 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-2.5 pr-3">
          <div className="h-3 bg-gray-100 rounded-full" style={{ width: [80, 120, 70, 36, 90][i] ?? 60 }} />
        </td>
      ))}
    </tr>
  );
}

// ─── ESTADOS SOLICITUD ────────────────────────────────────────────────────────

const ESTADO_BADGE_SOL = {
  BORRADOR:           { text: 'Borrador',            cls: 'bg-gray-100 text-gray-600' },
  PENDIENTE_REVISION: { text: 'Pendiente Revisión',  cls: 'bg-amber-100 text-amber-700' },
  ACTIVA:             { text: 'Activa',              cls: 'bg-green-100 text-green-700' },
  VENCIDA:            { text: 'Vencida',             cls: 'bg-red-100 text-red-700' },
  ANULADA:            { text: 'Anulada',             cls: 'bg-slate-100 text-slate-600' },
};

const TIPO_LABEL = {
  POLIZA_CUMPLIMIENTO: 'Cumplimiento',
  POLIZA_ANTICIPO:     'Anticipo',
  POLIZA_CALIDAD:      'Calidad',
  GARANTIA_BANCARIA:   'Gta. Bancaria',
  PAGARE:              'Pagaré',
  CUMPLIMIENTO:        'Cumplimiento',
  CORRECTO_MANEJO:     'Anticipo',
  CALIDAD_SERVICIO:    'Calidad',
  OTRO:                'Otro',
};

// ─── TAB: SOLICITUDES PMO ─────────────────────────────────────────────────────

function SolicitudesTab() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    solicitudesApi.listar()
      .then(({ data }) => setSolicitudes(data))
      .catch((err) => setError(err.mensajeUsuario ?? 'Error al cargar solicitudes'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">Solicitudes PMO</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Solicitudes de garantía creadas por la PMO en estado BORRADOR
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {loading ? '…' : solicitudes.length} registros
          </span>
        </div>

        {error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60">
                  {['Radicado', 'Comprobante', 'Tipo', 'Monto', 'Estado', 'Fecha', ''].map((col) => (
                    <th
                      key={col}
                      className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} cols={6} />)
                  : solicitudes.length === 0
                    ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
                              <FileText size={20} className="text-[#CC6628]" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">Sin solicitudes</p>
                            <p className="text-xs text-gray-400">Aún no se han creado solicitudes PMO.</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : solicitudes.map((sol) => {
                        const badge = ESTADO_BADGE_SOL[sol.estado] ?? { text: sol.estado, cls: 'bg-gray-100 text-gray-600' };
                        return (
                          <tr
                            key={sol.id}
                            className="hover:bg-orange-50/30 transition-colors cursor-pointer"
                            onClick={() => setSeleccionada(sol)}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="font-mono text-xs font-semibold text-gray-800">
                                {sol.numero_radicado ?? `#${sol.id}`}
                              </p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-mono text-xs font-bold text-[#CC6628] bg-orange-50 px-2 py-0.5 rounded-lg">
                                {sol.codigo_comprobante ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {TIPO_LABEL[sol.tipo_garantia] ?? sol.tipo_garantia}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                              {sol.monto_asegurado != null
                                ? new Intl.NumberFormat('es-CO', {
                                    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
                                  }).format(sol.monto_asegurado)
                                : <span className="text-gray-400">—</span>
                              }
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                                {badge.text}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                              {sol.created_at
                                ? new Date(sol.created_at).toLocaleDateString('es-CO')
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <ChevronRight size={14} className="text-gray-300" />
                            </td>
                          </tr>
                        );
                      })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SolicitudDetailModal
        isOpen={!!seleccionada}
        solicitud={seleccionada}
        onClose={() => setSeleccionada(null)}
      />
    </>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

const TABS = [
  { id: 'polizas',     label: 'Pólizas',          icon: ShieldCheck },
  { id: 'solicitudes', label: 'Solicitudes PMO',   icon: FileText },
];

export default function DashboardGeneral() {
  const [tabActiva, setTabActiva] = useState('polizas');

  const [stats,           setStats]           = useState(null);
  const [resumen,         setResumen]         = useState(null);
  const [urgentes,        setUrgentes]        = useState([]);
  const [loadingStats,    setLoadingStats]    = useState(true);
  const [loadingResumen,  setLoadingResumen]  = useState(true);
  const [loadingUrgentes, setLoadingUrgentes] = useState(true);

  useEffect(() => {
    polizasApi.stats()
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    carteraApi.resumen()
      .then(({ data }) => setResumen(data))
      .catch(() => setResumen(null))
      .finally(() => setLoadingResumen(false));
  }, []);

  useEffect(() => {
    polizasApi.listar({ solo_por_vencer_dias: 7, por_pagina: 5 })
      .then(({ data }) => setUrgentes(data.items ?? []))
      .catch(() => setUrgentes([]))
      .finally(() => setLoadingUrgentes(false));
  }, []);

  const totalActivas   = stats?.resumen_por_estado?.ACTIVA ?? 0;
  const cartPendiente  = resumen?.gran_total_pendiente ?? 0;
  const criticas       = stats?.alertas?.criticas_7_dias ?? 0;

  const datosCartera = [
    { name: 'Pendiente', valor: resumen?.gran_total_pendiente ?? 0 },
    { name: 'Abonado',   valor: resumen?.gran_total_abonado   ?? 0 },
    { name: 'Pagado',    valor: resumen?.gran_total_pagado    ?? 0 },
  ];
  const COLORES = ['#f59e0b', '#3b82f6', '#22c55e'];

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── ENCABEZADO ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">
          IDEXUD · Universidad Distrital
        </p>
        <h1 className="text-2xl font-bold text-gray-800 font-['Lora',serif]">
          Panel de Control
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{fechaHoy}</p>
      </div>

      {/* ── KPI ROW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={ShieldCheck}
          label="Pólizas Activas"
          valor={totalActivas}
          sub={`${stats?.total_polizas ?? '—'} en el sistema`}
          colorBg="bg-[#CC6628]"
          loading={loadingStats}
        />
        <KpiCard
          icon={Wallet}
          label="Cartera Pendiente"
          valor={formatMillones(cartPendiente)}
          sub="Pendiente de reintegro"
          colorBg="bg-amber-500"
          loading={loadingResumen}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Pólizas Críticas"
          valor={criticas}
          sub="Vencen en los próximos 7 días"
          colorBg={criticas > 0 ? 'bg-red-500' : 'bg-green-500'}
          loading={loadingStats}
        />
      </div>

      {/* ── PESTAÑAS EXCEL ──────────────────────────────────────────── */}
      <div>
        {/* Tab bar */}
        <div className="flex items-end gap-0 border-b border-gray-200 mb-5">
          {TABS.map((tab) => {
            const activa = tabActiva === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={[
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all relative',
                  activa
                    ? 'border-[#CC6628] text-[#CC6628] bg-white rounded-t-lg -mb-px'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300',
                ].join(' ')}
              >
                <TabIcon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB: PÓLIZAS ──────────────────────────────────────────── */}
        {tabActiva === 'polizas' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* GRÁFICO */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="mb-5">
                <h2 className="font-semibold text-gray-800 text-sm">Estado de Cartera</h2>
                <p className="text-xs text-gray-400 mt-0.5">Distribución por estado de pago (en COP)</p>
              </div>
              {loadingResumen ? (
                <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={datosCartera} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false} tickLine={false} width={52}
                    />
                    <Tooltip content={<TooltipCOP />} cursor={{ fill: '#f9fafb' }} />
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={80}>
                      {datosCartera.map((_, i) => <Cell key={i} fill={COLORES[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {!loadingResumen && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                  {datosCartera.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORES[i] }} />
                      <span className="text-xs text-gray-500">{d.name}</span>
                      <span className="text-xs font-semibold text-gray-700">{formatMillones(d.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PÓLIZAS URGENTES */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="mb-5">
                <h2 className="font-semibold text-gray-800 text-sm">Pólizas Críticas por Vencer</h2>
                <p className="text-xs text-gray-400 mt-0.5">Vencen en los próximos 7 días</p>
              </div>
              {loadingUrgentes ? (
                <table className="w-full">
                  <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} />)}</tbody>
                </table>
              ) : urgentes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-44 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                    <ShieldCheck size={22} className="text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Sin pólizas críticas</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ninguna póliza vence en los próximos 7 días.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50">
                        {['Póliza', 'Contratista', 'Vence', 'Días'].map((col) => (
                          <th key={col} className="text-left pb-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide pr-3">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {urgentes.map((p) => {
                        const dias = diasRestantes(p.vigencia_hasta);
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-2.5 pr-3">
                              <p className="font-mono font-semibold text-xs text-gray-800">
                                {p.numero_poliza || 'PENDIENTE'}
                              </p>
                              <p className="text-[10px] text-gray-400">{p.tipo}</p>
                            </td>
                            <td className="py-2.5 pr-3 text-xs text-gray-600 max-w-[120px] truncate">
                              {p.contratista?.nombre_razon_social || '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-xs text-gray-500 whitespace-nowrap">
                              {p.vigencia_hasta_fmt || '—'}
                            </td>
                            <td className="py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                dias != null && dias <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {dias != null ? `${dias}d` : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: SOLICITUDES PMO ──────────────────────────────────── */}
        {tabActiva === 'solicitudes' && <SolicitudesTab />}
      </div>
    </div>
  );
}
