import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Bell, Mail, ShieldAlert, TrendingUp, AlertTriangle, Clock } from "lucide-react";

// ─── DATOS ESTÁTICOS DE DEMO ──────────────────────────────────────────────────

const ALERTAS_POR_DIA = [
  { dia: "Lun",  alertas: 6, criticas: 2 },
  { dia: "Mar",  alertas: 8, criticas: 3 },
  { dia: "Mié",  alertas: 3, criticas: 1 },
  { dia: "Jue",  alertas: 5, criticas: 2 },
  { dia: "Vie",  alertas: 2, criticas: 0 },
  { dia: "Sáb",  alertas: 0, criticas: 0 },
  { dia: "Dom",  alertas: 0, criticas: 0 },
];

const DISTRIBUCION_TIPO = [
  { name: "Críticas (≤ 7 días)",    value: 8,  color: "#dc2626" },
  { name: "Urgentes (8-15 días)",   value: 6,  color: "#d97706" },
  { name: "Próximas (16-30 días)",  value: 10, color: "#2563eb" },
];

const ALERTAS_RECIENTES = [
  { id: 1, fecha: "20 may 2026", poliza: "POL-2024-00142", aseguradora: "Seguros Bolívar",       diasRestantes: 3,  tipo: "Crítica",  destinatario: "supervisor.recto@ud.edu.co" },
  { id: 2, fecha: "20 may 2026", poliza: "POL-2024-00201", aseguradora: "Seguros del Estado",    diasRestantes: 5,  tipo: "Crítica",  destinatario: "coord.tecnologica@ud.edu.co" },
  { id: 3, fecha: "19 may 2026", poliza: "POL-2024-00055", aseguradora: "Positiva Cía. Seguros", diasRestantes: 11, tipo: "Urgente", destinatario: "jefe.ambiente@ud.edu.co" },
  { id: 4, fecha: "19 may 2026", poliza: "POL-2024-00089", aseguradora: "Mapfre Colombia",       diasRestantes: 18, tipo: "Próxima", destinatario: "dir.ingenieria@ud.edu.co" },
  { id: 5, fecha: "18 may 2026", poliza: "POL-2023-00490", aseguradora: "Allianz Colombia",      diasRestantes: 24, tipo: "Próxima", destinatario: "asab.coord@ud.edu.co" },
];

// ─── TOOLTIP PERSONALIZADO ────────────────────────────────────────────────────

function TooltipBarra({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function TooltipTorta({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: { color } } = payload[0];
  const total = DISTRIBUCION_TIPO.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span className="font-semibold text-gray-700">{name}</span>
      </div>
      <p className="text-gray-500">{value} alertas — <span className="font-bold text-gray-800">{Math.round((value / total) * 100)}%</span></p>
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

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function AlertasPage() {
  const totalSemana    = ALERTAS_POR_DIA.reduce((s, d) => s + d.alertas, 0);
  const totalCriticas  = ALERTAS_POR_DIA.reduce((s, d) => s + d.criticas, 0);
  const polizasUnicas  = new Set(ALERTAS_RECIENTES.map((a) => a.poliza)).size;

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 animate-fade-in">

      {/* ── CABECERA EJECUTIVA ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-8 py-7 text-white overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1A1A1A 0%, #2E2E2E 60%, #3d2010 100%)" }}
      >
        {/* Decoración geométrica */}
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full opacity-5"
          style={{ background: "#CC6628", transform: "translate(30%, -30%)" }} />
        <div className="absolute right-20 bottom-0 w-40 h-40 rounded-full opacity-5"
          style={{ background: "#FE9D12", transform: "translateY(50%)" }} />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#CC6628]">IDEXUD · Módulo de Alertas</span>
            </div>
            <h1 className="text-3xl font-bold font-['Lora',serif] leading-tight">
              Centro de Alertas
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 max-w-md">
              Monitoreo de notificaciones automáticas enviadas a supervisores y coordinadores.
              Semana del 13 al 20 de mayo de 2026.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5">
            <Clock size={14} className="text-[#FE9D12]" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Última ejecución</p>
              <p className="text-sm font-semibold">Hoy, 06:00 a.m.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Bell}
          label="Alertas esta semana"
          value={totalSemana}
          sublabel="↑ 12% vs. semana anterior"
          colorClass="bg-[#CC6628]"
          borderClass="border-orange-100"
        />
        <KpiCard
          icon={ShieldAlert}
          label="Alertas críticas"
          value={totalCriticas}
          sublabel="Vencen en ≤ 7 días"
          colorClass="bg-red-500"
          borderClass="border-red-100"
        />
        <KpiCard
          icon={Mail}
          label="Correos enviados"
          value={totalSemana}
          sublabel="100% de tasa de entrega"
          colorClass="bg-blue-600"
          borderClass="border-blue-100"
        />
        <KpiCard
          icon={TrendingUp}
          label="Pólizas notificadas"
          value={polizasUnicas + 13}
          sublabel="Contratos monitoreados"
          colorClass="bg-emerald-600"
          borderClass="border-emerald-100"
        />
      </div>

      {/* ── GRÁFICOS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Barras: alertas por día */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Esta semana</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">Alertas enviadas por día</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#CC6628" }} />
                Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block bg-red-500" />
                Críticas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={ALERTAS_POR_DIA} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 500 }} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }} width={28} allowDecimals={false} />
              <Tooltip content={<TooltipBarra />} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="alertas" name="Total" fill="#CC6628" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="criticas" name="Críticas" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Torta: distribución por tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Distribución</p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">Por nivel de urgencia</h2>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={DISTRIBUCION_TIPO}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {DISTRIBUCION_TIPO.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<TooltipTorta />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Leyenda manual */}
          <div className="mt-4 space-y-2">
            {DISTRIBUCION_TIPO.map((d) => {
              const total = DISTRIBUCION_TIPO.reduce((s, x) => s + x.value, 0);
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
        </div>
      </div>

      {/* ── TABLA: ÚLTIMAS ALERTAS ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Registro de alertas recientes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimas notificaciones automáticas generadas por el sistema</p>
          </div>
          <span className="text-xs font-semibold text-[#CC6628] bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
            {ALERTAS_RECIENTES.length} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {["Fecha", "N.° Póliza", "Aseguradora", "Días restantes", "Tipo", "Destinatario"].map((col) => (
                  <th key={col} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ALERTAS_RECIENTES.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{a.fecha}</td>
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gray-800">{a.poliza}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-600">{a.aseguradora}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (a.diasRestantes / 30) * 100)}%`,
                            background: a.diasRestantes <= 7 ? "#dc2626" : a.diasRestantes <= 15 ? "#d97706" : "#2563eb",
                          }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${a.diasRestantes <= 7 ? "text-red-600" : a.diasRestantes <= 15 ? "text-amber-600" : "text-blue-600"}`}>
                        {a.diasRestantes}d
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><BadgeTipoAlerta tipo={a.tipo} /></td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">{a.destinatario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Alertas generadas automáticamente · Scheduler diario 06:00 a.m.
          </p>
          <p className="text-xs text-gray-300">IDEXUD · Universidad Distrital</p>
        </div>
      </div>

    </div>
  );
}
