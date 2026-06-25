import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { AlertTriangle, CalendarClock, ShieldCheck, XCircle } from "lucide-react";
import { polizasApi } from "../../services/api";

// ─── MAPAS DE TIPO ────────────────────────────────────────────────────────────

const TIPO_COLORS = {
  CUMPLIMIENTO:      "#CC6628",
  RCE:               "#2563eb",
  CALIDAD_SERVICIO:  "#7c3aed",
  PAGO_SALARIOS:     "#16a34a",
  ESTABILIDAD_OBRA:  "#d97706",
  CORRECTO_MANEJO:   "#0891b2",
  RESPONSABILIDAD_CIVIL: "#be185d",
  OTRO:              "#94a3b8",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatCOP = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(v ?? 0);

// Calcula días hasta vencimiento sin desfase de timezone.
// new Date('YYYY-MM-DD') interpreta UTC → en UTC-5 el día aparece un día antes.
// Parseando componentes y usando Date local evitamos ese bug.
function calcDiasLocal(vigencia_hasta) {
  if (!vigencia_hasta) return null;
  const [y, m, d] = vigencia_hasta.split('-').map(Number);
  const vence = new Date(y, m - 1, d);
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((vence - hoy) / 86_400_000);
}

// Formatea 'YYYY-MM-DD' de forma safe para los filtros de API
const isoFmt = (d) => d.toISOString().split('T')[0];

// Agrupa polizas en 8 cubetas semanales a partir de hoy
function calcularVencimientosSemanales(polizas) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cubetas = Array.from({ length: 8 }, (_, i) => {
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() + i * 7);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    const semanaNum = getISOWeek(inicio);
    const label = `${inicio.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${fin.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`;
    return { semana: `S.${semanaNum}`, label, vencen: 0, _inicio: inicio, _fin: fin };
  });

  for (const p of polizas) {
    if (!p.vigencia_hasta) continue;
    const vence = new Date(p.vigencia_hasta + "T00:00:00");
    for (const c of cubetas) {
      if (vence >= c._inicio && vence <= c._fin) { c.vencen++; break; }
    }
  }
  return cubetas;
}

function getISOWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function calcularDistribucionTipo(polizas) {
  const conteo = {};
  for (const p of polizas) {
    const tipo = p.tipo || "OTRO";
    conteo[tipo] = (conteo[tipo] || 0) + 1;
  }
  return Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, value]) => ({
      name: polizas.find((p) => p.tipo === tipo)?.etiqueta_tipo ?? tipo,
      value,
      color: TIPO_COLORS[tipo] ?? "#94a3b8",
    }));
}

// ─── TOOLTIPS ────────────────────────────────────────────────────────────────

function TooltipBarra({ active, payload, label, semanales }) {
  if (!active || !payload?.length) return null;
  const item = semanales.find((d) => d.semana === label);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="font-bold text-gray-700">{label}</p>
      <p className="text-[11px] text-gray-400 mb-2">{item?.label}</p>
      <p className="flex items-center justify-between gap-4">
        <span className="text-gray-500">Vencimientos</span>
        <span className="font-bold text-[#CC6628]">{payload[0].value}</span>
      </p>
    </div>
  );
}

function TooltipTorta({ active, payload, distribucion }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: { color } } = payload[0];
  const total = distribucion.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span className="font-semibold text-gray-700">{name}</span>
      </div>
      <p className="text-gray-500">
        {value} pólizas — <span className="font-bold text-gray-800">{Math.round((value / total) * 100)}%</span>
      </p>
    </div>
  );
}

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sublabel, accent, bg, border }) {
  return (
    <div className={`bg-white rounded-2xl border ${border} p-5 shadow-sm`}>
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
          <p className={`text-3xl font-bold mt-0.5 leading-none ${accent}`}>{value}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-2.5 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-1" />
          <div className="h-2 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

function SkeletonFila() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4"><div className="h-3.5 bg-gray-100 rounded w-32" /></td>
      <td className="px-5 py-4"><div className="h-5 bg-gray-100 rounded-full w-20" /></td>
      <td className="px-5 py-4">
        <div className="h-3.5 bg-gray-100 rounded w-28 mb-1" />
        <div className="h-2.5 bg-gray-50 rounded w-20" />
      </td>
      <td className="px-5 py-4"><div className="h-3.5 bg-gray-100 rounded w-24" /></td>
      <td className="px-5 py-4"><div className="h-3.5 bg-gray-100 rounded w-20" /></td>
      <td className="px-5 py-4"><div className="h-5 bg-gray-100 rounded-full w-16" /></td>
    </tr>
  );
}

function BadgeDias({ dias }) {
  if (dias < 0)   return <span className="inline-flex items-center gap-1 text-xs font-bold text-red-800 bg-red-100 border border-red-300 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-700" />VENCIDA</span>;
  if (dias <= 7)  return <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{dias} días</span>;
  if (dias <= 15) return <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{dias} días</span>;
  return            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />{dias} días</span>;
}

function UrgencyBar({ dias }) {
  const pct = Math.max(4, Math.min(100, 100 - (dias / 60) * 100));
  const color = dias <= 7 ? "#dc2626" : dias <= 15 ? "#d97706" : "#2563eb";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function PorVencerPage() {
  const [polizas, setPolizas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Usamos rango de fechas en lugar de solo_por_vencer_dias porque ese filtro
    // en el backend exige estado=ACTIVA|POR_VENCER, excluyendo datos en BORRADOR.
    const hoy    = new Date();
    const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 30);
    const en60   = new Date(hoy); en60.setDate(hoy.getDate() + 60);

    polizasApi.listar({
      vence_despues_de: isoFmt(hace30),
      vence_antes_de:   isoFmt(en60),
      por_pagina: 100,
    })
      .then(({ data }) => {
        const items = (data.items ?? []).map(p => ({
          ...p,
          // dias_para_vencer viene del backend; calcDiasLocal como fallback
          // ante ausencia del campo o desfase de timezone
          dias_para_vencer: p.dias_para_vencer ?? calcDiasLocal(p.vigencia_hasta),
        }));
        console.log('[PorVencer] API →', {
          total_backend: data.total,
          items_recibidos: items.length,
          muestra: items.slice(0, 3).map(p => ({
            numero: p.numero_poliza,
            estado: p.estado,
            vigencia_hasta: p.vigencia_hasta,
            dias_backend: p.dias_para_vencer,
            dias_local: calcDiasLocal(p.vigencia_hasta),
          })),
        });
        setPolizas(items);
      })
      .catch((err) => {
        console.error('[PorVencer] Error cargando pólizas:', {
          status: err.response?.status,
          detail: err.response?.data?.detail,
          mensaje: err.mensajeUsuario,
        });
        setError(err.mensajeUsuario ?? "Error al cargar pólizas por vencer.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Todas las pólizas ordenadas por urgencia (vencidas recientes primero, luego próximas).
  // Incluimos días negativos (vencidas recientes) para que el rango -30..+60 que
  // pedimos al API sea visible completo; el usuario ve tanto el pasado reciente
  // como el futuro próximo en una sola tabla.
  const polizasOrdenadas = useMemo(() => {
    const resultado = [...polizas]
      .sort((a, b) => (a.dias_para_vencer ?? 0) - (b.dias_para_vencer ?? 0));

    console.log('[PorVencer useMemo] polizas recibidas:', polizas.length,
      '→ ordenadas:', resultado.length,
      '| muestra:', resultado.slice(0, 3).map(p => ({
        numero: p.numero_poliza,
        vigencia_hasta: p.vigencia_hasta,
        dias: p.dias_para_vencer,
        local: calcDiasLocal(p.vigencia_hasta),
      })));

    // Fallback: si el array llegó vacío pero hay datos en polizas, algo va mal con el filtro
    if (resultado.length === 0 && polizas.length > 0) {
      console.warn('[PorVencer] El sort produjo array vacío con', polizas.length, 'polizas. Mostrando todas sin filtro.');
    }

    return resultado;
  }, [polizas]);

  // Pólizas VENCIDAS: usadas solo para el KPI de conteo
  const polizasVencidas = useMemo(() =>
    polizas.filter((p) => p.vigencia_hasta && (p.dias_para_vencer ?? 0) < 0),
    [polizas]
  );

  const vencimientosSemanales = useMemo(() => calcularVencimientosSemanales(polizas), [polizas]);
  const distribucionTipo      = useMemo(() => calcularDistribucionTipo(polizasOrdenadas.filter(p => (p.dias_para_vencer ?? 0) >= 0)), [polizasOrdenadas]);

  // KPIs: solo pólizas con vigencia futura (>= 0 dias)
  const criticas7    = polizas.filter((p) => (p.dias_para_vencer ?? 0) >= 0 && (p.dias_para_vencer ?? 0) <= 7).length;
  const urgentes15   = polizas.filter((p) => (p.dias_para_vencer ?? 0) > 7  && (p.dias_para_vencer ?? 0) <= 15).length;
  const proximas30   = polizas.filter((p) => (p.dias_para_vencer ?? 0) > 15 && (p.dias_para_vencer ?? 0) <= 30).length;
  const totalVencidas = polizasVencidas.length;

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 animate-fade-in">

      {/* ── CABECERA EJECUTIVA ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-8 py-7 text-white overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1A1A1A 0%, #2E2E2E 60%, #1a2540 100%)" }}
      >
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full opacity-5"
          style={{ background: "#2563eb", transform: "translate(30%, -30%)" }} />
        <div className="absolute right-20 bottom-0 w-40 h-40 rounded-full opacity-5"
          style={{ background: "#dc2626", transform: "translateY(50%)" }} />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">IDEXUD · Pólizas por Vencer</span>
            </div>
            <h1 className="text-3xl font-bold font-['Lora',serif] leading-tight">
              Vencimientos de Pólizas
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 max-w-md">
              Panorama ejecutivo de garantías próximas a vencer. Período analizado: próximas 8 semanas.
            </p>
          </div>
          {!loading && criticas7 > 0 && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/25 rounded-xl px-4 py-2.5">
              <AlertTriangle size={14} className="text-red-400" />
              <div>
                <p className="text-[10px] text-red-300 uppercase tracking-wide font-semibold">Atención inmediata</p>
                <p className="text-sm font-bold text-red-200">{criticas7} pólizas vencen en ≤ 7 días</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Banner de error */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm text-red-700">No se pudieron cargar los datos</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : <>
              <KpiCard icon={AlertTriangle} label="Críticas (≤ 7 días)"   value={criticas7}      sublabel="Requieren acción inmediata" accent="text-red-600"   bg="bg-red-500"    border="border-red-100" />
              <KpiCard icon={CalendarClock} label="Urgentes (8-15 días)"  value={urgentes15}     sublabel="Gestión prioritaria"        accent="text-amber-600" bg="bg-amber-500"  border="border-amber-100" />
              <KpiCard icon={ShieldCheck}   label="Próximas (16-30 días)" value={proximas30}     sublabel="En seguimiento"             accent="text-blue-600"  bg="bg-blue-600"   border="border-blue-100" />
              <KpiCard icon={XCircle}       label="Vencidas"              value={totalVencidas}  sublabel="Vigencia expirada"          accent="text-gray-700"  bg="bg-gray-500"   border="border-gray-200" />
            </>
        }
      </div>

      {/* ── GRÁFICOS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Barras: vencimientos por semana */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Proyección</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">Vencimientos por semana</h2>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              Próximas 8 semanas · Datos reales
            </span>
          </div>
          {loading
            ? <div className="h-[230px] bg-gray-50 rounded-xl animate-pulse" />
            : <>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={vencimientosSemanales} barCategoryGap="32%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 500 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} width={28} allowDecimals={false} />
                    <Tooltip content={<TooltipBarra semanales={vencimientosSemanales} />} cursor={{ fill: "#f9fafb" }} />
                    <Bar dataKey="vencen" name="Pólizas" radius={[7, 7, 0, 0]} maxBarSize={44}>
                      {vencimientosSemanales.map((entry) => (
                        <Cell key={entry.semana} fill={entry.vencen >= 7 ? "#CC6628" : entry.vencen >= 4 ? "#d97706" : "#93c5fd"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-5 mt-3 justify-end text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#CC6628" }} />Alta carga (≥ 7)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />Media (4-6)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300" />Baja (≤ 3)</span>
                </div>
              </>
          }
        </div>

        {/* Torta: distribución por tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Composición</p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">Por tipo de garantía</h2>
          </div>
          {loading
            ? <div className="h-[170px] bg-gray-50 rounded-xl animate-pulse" />
            : <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={distribucionTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {distribucionTipo.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<TooltipTorta distribucion={distribucionTipo} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {distribucionTipo.map((d) => {
                    const total = distribucionTipo.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-gray-600 truncate max-w-[130px]">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{d.value}</span>
                          <span className="text-gray-400 w-7 text-right">{Math.round((d.value / total) * 100)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
          }
        </div>
      </div>

      {/* ── TABLA: PÓLIZAS MÁS URGENTES ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pólizas que requieren gestión inmediata</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ordenadas por proximidad al vencimiento · Datos en tiempo real</p>
          </div>
          {!loading && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
              {criticas7} críticas
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {["N.° Póliza", "Tipo", "Contratista", "Valor asegurado", "Vencimiento", "Urgencia"].map((col) => (
                  <th key={col} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} />)
              ) : polizasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="font-semibold text-gray-700 text-sm">No hay pólizas en el período analizado</p>
                    <p className="text-xs text-gray-400 mt-1">
                      No se encontraron pólizas con vencimiento entre los últimos 30 días y los próximos 60 días.
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Verifique que existan pólizas con fechas de vigencia registradas en ese período.
                    </p>
                  </td>
                </tr>
              ) : (
                polizasOrdenadas.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-gray-800 group-hover:text-[#CC6628] transition-colors">
                        {p.numero_poliza}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg font-medium">
                        {p.etiqueta_tipo ?? p.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-800">
                        {p.contratista?.nombre_razon_social ?? "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {p.contratista?.numero_identificacion ?? ""}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-xs text-gray-700 whitespace-nowrap">
                      {formatCOP(p.valor_asegurado)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {p.vigencia_hasta_fmt ?? p.vigencia_hasta}
                      </p>
                      <UrgencyBar dias={p.dias_para_vencer ?? 0} />
                    </td>
                    <td className="px-5 py-4">
                      <BadgeDias dias={p.dias_para_vencer ?? 0} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Datos en tiempo real · Base de datos IDEXUD
          </p>
          <p className="text-xs text-gray-300">Universidad Distrital Francisco José de Caldas</p>
        </div>
      </div>

    </div>
  );
}
