import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Bell, Mail, ShieldAlert, TrendingUp, AlertTriangle, Clock, Info } from "lucide-react";
import { polizasApi } from "../../services/api";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function tipoAlerta(dias) {
  if (dias <= 7)  return "Crítica";
  if (dias <= 15) return "Urgente";
  return "Próxima";
}

// Distribución por nivel de urgencia para el pie chart
function calcularDistribucion(polizas) {
  let criticas = 0, urgentes = 0, proximas = 0;
  for (const p of polizas) {
    const d = p.dias_para_vencer ?? 0;
    if (d <= 7) criticas++;
    else if (d <= 15) urgentes++;
    else proximas++;
  }
  return [
    { name: "Críticas (≤ 7 días)",   value: criticas, color: "#dc2626" },
    { name: "Urgentes (8-15 días)",   value: urgentes, color: "#d97706" },
    { name: "Próximas (16-30 días)",  value: proximas, color: "#2563eb" },
  ].filter((d) => d.value > 0);
}

// Agrupa vencimientos de la semana en curso por día
function calcularVencimientosPorDia(polizas) {
  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  lunes.setHours(0, 0, 0, 0);

  const slots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return { dia: DIAS[d.getDay()], alertas: 0, criticas: 0, _fecha: d };
  });

  for (const p of polizas) {
    if (!p.vigencia_hasta) continue;
    const vence = new Date(p.vigencia_hasta + "T00:00:00");
    for (const slot of slots) {
      if (
        vence.getFullYear() === slot._fecha.getFullYear() &&
        vence.getMonth()    === slot._fecha.getMonth() &&
        vence.getDate()     === slot._fecha.getDate()
      ) {
        slot.alertas++;
        if ((p.dias_para_vencer ?? 0) <= 7) slot.criticas++;
      }
    }
  }
  return slots;
}

// ─── TOOLTIPS ────────────────────────────────────────────────────────────────

function TooltipBarra({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2" style={{ color: p.fill }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
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
      <p className="text-gray-500">{value} pólizas — <span className="font-bold text-gray-800">{Math.round((value / total) * 100)}%</span></p>
    </div>
  );
}

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sublabel, colorClass, borderClass }) {
  return (
    <div className={`bg-white rounded-2xl border ${borderClass} p-5 shadow-sm flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-0.5 leading-none">{value}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0" />
      <div className="flex-1">
        <div className="h-2.5 bg-gray-100 rounded w-2/3 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-1" />
        <div className="h-2 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

function BadgeTipoAlerta({ tipo }) {
  const cfg = {
    Crítica: "bg-red-50 text-red-700 border border-red-200",
    Urgente: "bg-amber-50 text-amber-700 border border-amber-200",
    Próxima: "bg-blue-50 text-blue-700 border border-blue-200",
  }[tipo] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg}`}>
      {tipo}
    </span>
  );
}

function SkeletonFila() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-3.5"><div className="h-3 bg-gray-100 rounded w-20" /></td>
      <td className="px-5 py-3.5"><div className="h-3 bg-gray-100 rounded w-28" /></td>
      <td className="px-5 py-3.5"><div className="h-3 bg-gray-100 rounded w-24" /></td>
      <td className="px-5 py-3.5"><div className="h-3 bg-gray-100 rounded w-16" /></td>
      <td className="px-5 py-3.5"><div className="h-5 bg-gray-100 rounded-full w-16" /></td>
      <td className="px-5 py-3.5"><div className="h-3 bg-gray-100 rounded w-28" /></td>
    </tr>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function AlertasPage() {
  const [polizas, setPolizas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    polizasApi.listar({ solo_por_vencer_dias: 30, por_pagina: 100 })
      .then(({ data }) => setPolizas(data.items ?? []))
      .catch((err) => setError(err.mensajeUsuario ?? "Error al cargar datos."))
      .finally(() => setLoading(false));
  }, []);

  const polizasOrdenadas = useMemo(() =>
    [...polizas]
      .filter((p) => (p.dias_para_vencer ?? 0) >= 0)
      .sort((a, b) => (a.dias_para_vencer ?? 0) - (b.dias_para_vencer ?? 0)),
    [polizas]
  );

  const distribucion   = useMemo(() => calcularDistribucion(polizasOrdenadas), [polizasOrdenadas]);
  const alertasPorDia  = useMemo(() => calcularVencimientosPorDia(polizasOrdenadas), [polizasOrdenadas]);

  const criticas7 = polizasOrdenadas.filter((p) => (p.dias_para_vencer ?? 0) <= 7).length;
  const total30   = polizasOrdenadas.length;

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 animate-fade-in">

      {/* ── CABECERA EJECUTIVA ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-8 py-7 text-white overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1A1A1A 0%, #2E2E2E 60%, #3d2010 100%)" }}
      >
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full opacity-5"
          style={{ background: "#CC6628", transform: "translate(30%, -30%)" }} />
        <div className="absolute right-20 bottom-0 w-40 h-40 rounded-full opacity-5"
          style={{ background: "#FE9D12", transform: "translateY(50%)" }} />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#CC6628]">IDEXUD · Módulo de Alertas</span>
            </div>
            <h1 className="text-3xl font-bold font-['Lora',serif] leading-tight">Centro de Alertas</h1>
            <p className="text-sm text-gray-400 mt-1.5 max-w-md">
              Pólizas con vencimiento en los próximos 30 días que activarán notificaciones automáticas.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5">
            <Clock size={14} className="text-[#FE9D12]" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Datos actualizados</p>
              <p className="text-sm font-semibold">En tiempo real · BD IDEXUD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner: motor de alertas pendiente */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          <span className="font-semibold">Motor de alertas pendiente de conexión.</span>{" "}
          Se muestran las pólizas que activarán notificaciones automáticas cuando el servicio SMTP / Twilio esté configurado.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700"><span className="font-semibold">Error al cargar datos:</span> {error}</p>
        </div>
      )}

      {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : <>
              <KpiCard icon={Bell}       label="Pendientes de alerta"   value={total30}   sublabel="Próximos 30 días"        colorClass="bg-[#CC6628]"   borderClass="border-orange-100" />
              <KpiCard icon={ShieldAlert} label="Críticas (≤ 7 días)"  value={criticas7}  sublabel="Requieren acción ya"     colorClass="bg-red-500"    borderClass="border-red-100" />
              <KpiCard icon={Mail}        label="Correos a enviar"      value={total30}    sublabel="Pendientes de despacho"  colorClass="bg-blue-600"   borderClass="border-blue-100" />
              <KpiCard icon={TrendingUp}  label="Pólizas monitoreadas"  value={total30}    sublabel="En ventana de 30 días"   colorClass="bg-emerald-600" borderClass="border-emerald-100" />
            </>
        }
      </div>

      {/* ── GRÁFICOS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Barras: vencimientos esta semana por día */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Esta semana</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">Vencimientos por día</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#CC6628" }} />Total</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block bg-red-500" />Críticos</span>
            </div>
          </div>
          {loading
            ? <div className="h-[230px] bg-gray-50 rounded-xl animate-pulse" />
            : <ResponsiveContainer width="100%" height={230}>
                <BarChart data={alertasPorDia} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 500 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} width={28} allowDecimals={false} />
                  <Tooltip content={<TooltipBarra />} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="alertas" name="Total"   fill="#CC6628" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="criticas" name="Críticos" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Torta: distribución por urgencia */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Distribución</p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">Por nivel de urgencia</h2>
          </div>
          {loading
            ? <div className="h-[170px] bg-gray-50 rounded-xl animate-pulse mb-4" />
            : <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={distribucion} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {distribucion.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<TooltipTorta distribucion={distribucion} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {distribucion.map((d) => {
                    const total = distribucion.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-gray-600 truncate max-w-[130px]">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-gray-800">{d.value}</span>
                          <span className="text-gray-400 w-8 text-right">{Math.round((d.value / total) * 100)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
          }
        </div>
      </div>

      {/* ── TABLA: PÓLIZAS PENDIENTES DE NOTIFICACIÓN ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pólizas pendientes de notificación</h2>
            <p className="text-xs text-gray-400 mt-0.5">Recibirán alertas automáticas cuando el motor de mensajería esté configurado</p>
          </div>
          {!loading && (
            <span className="text-xs font-semibold text-[#CC6628] bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
              {polizasOrdenadas.length} pendientes
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {["Vencimiento", "N.° Póliza", "Contratista", "Días restantes", "Nivel", "Estado póliza"].map((col) => (
                  <th key={col} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} />)
              ) : polizasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="text-3xl mb-3">✅</div>
                    <p className="text-sm font-semibold text-gray-600">No hay pólizas pendientes de alerta</p>
                    <p className="text-xs text-gray-400 mt-1">Todas las pólizas tienen vigencia superior a 30 días.</p>
                  </td>
                </tr>
              ) : (
                polizasOrdenadas.map((p) => {
                  const dias = p.dias_para_vencer ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                        {p.vigencia_hasta_fmt ?? p.vigencia_hasta}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gray-800">
                        {p.numero_poliza}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        {p.contratista?.nombre_razon_social ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.min(100, Math.max(4, (dias / 30) * 100))}%`,
                              background: dias <= 7 ? "#dc2626" : dias <= 15 ? "#d97706" : "#2563eb",
                            }} />
                          </div>
                          <span className={`text-xs font-bold ${dias <= 7 ? "text-red-600" : dias <= 15 ? "text-amber-600" : "text-blue-600"}`}>
                            {dias}d
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <BadgeTipoAlerta tipo={tipoAlerta(dias)} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {p.etiqueta_estado ?? p.estado}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">Datos en tiempo real · Base de datos IDEXUD</p>
          <p className="text-xs text-gray-300">IDEXUD · Universidad Distrital</p>
        </div>
      </div>

    </div>
  );
}
