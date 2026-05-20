import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { AlertTriangle, CalendarClock, ShieldCheck, Activity, ExternalLink } from "lucide-react";

// ─── DATOS ESTÁTICOS DE DEMO ──────────────────────────────────────────────────

const VENCIMIENTOS_SEMANALES = [
  { semana: "S.21",  vencen: 3, label: "12-18 may" },
  { semana: "S.22",  vencen: 6, label: "19-25 may" },
  { semana: "S.23",  vencen: 4, label: "26 may-1 jun" },
  { semana: "S.24",  vencen: 8, label: "2-8 jun" },
  { semana: "S.25",  vencen: 5, label: "9-15 jun" },
  { semana: "S.26",  vencen: 2, label: "16-22 jun" },
  { semana: "S.27",  vencen: 7, label: "23-29 jun" },
  { semana: "S.28",  vencen: 3, label: "30 jun-6 jul" },
];

const DISTRIBUCION_TIPO = [
  { name: "Cumplimiento",    value: 12, color: "#CC6628" },
  { name: "RCE",             value: 5,  color: "#2563eb" },
  { name: "Calidad Serv.",   value: 4,  color: "#7c3aed" },
  { name: "Pago Salarios",   value: 3,  color: "#16a34a" },
  { name: "Est. de Obra",    value: 2,  color: "#d97706" },
];

const POLIZAS_CRITICAS = [
  {
    id: 1,
    numero:      "POL-2024-00142",
    tipo:        "CUMPLIMIENTO",
    aseguradora: "Seguros Bolívar",
    contratista: "Construyendo SAS",
    vence:       "23 may 2026",
    dias:        3,
    valor:       18_500_000,
  },
  {
    id: 2,
    numero:      "POL-2024-00201",
    tipo:        "CUMPLIMIENTO",
    aseguradora: "Seguros del Estado",
    contratista: "Tecnored Ltda.",
    vence:       "25 may 2026",
    dias:        5,
    valor:       11_750_000,
  },
  {
    id: 3,
    numero:      "POL-2024-00055",
    tipo:        "RCE",
    aseguradora: "Positiva Cía. Seguros",
    contratista: "Ingeniería Verde SA",
    vence:       "31 may 2026",
    dias:        11,
    valor:        5_600_000,
  },
  {
    id: 4,
    numero:      "POL-2024-00089",
    tipo:        "PAGO_SALARIOS",
    aseguradora: "Mapfre Colombia",
    contratista: "Soluciones IT Corp.",
    vence:       "7 jun 2026",
    dias:        18,
    valor:        7_200_000,
  },
  {
    id: 5,
    numero:      "POL-2023-00377",
    tipo:        "CALIDAD_SERVICIO",
    aseguradora: "La Equidad Seguros",
    contratista: "Ecodiseño SAS",
    vence:       "14 jun 2026",
    dias:        25,
    valor:       34_000_000,
  },
];

const TIPO_LABEL = {
  CUMPLIMIENTO:      "Cumplimiento",
  RCE:               "RC Extracontractual",
  CALIDAD_SERVICIO:  "Calidad Servicio",
  PAGO_SALARIOS:     "Pago Salarios",
  ESTABILIDAD_OBRA:  "Est. de Obra",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatCOP = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(v);

// ─── TOOLTIPS ────────────────────────────────────────────────────────────────

function TooltipBarra({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = VENCIMIENTOS_SEMANALES.find((d) => d.semana === label);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[140px]">
      <p className="font-bold text-gray-700">{label}</p>
      <p className="text-[11px] text-gray-400 mb-2">{item?.label}</p>
      <p className="flex items-center justify-between gap-4">
        <span className="text-gray-500">Vencimientos</span>
        <span className="font-bold text-[#CC6628]">{payload[0].value}</span>
      </p>
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

function BadgeDias({ dias }) {
  if (dias <= 7)  return <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{dias} días</span>;
  if (dias <= 15) return <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{dias} días</span>;
  return            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />{dias} días</span>;
}

// Miniatura de barra de urgencia dentro de la tabla
function UrgencyBar({ dias }) {
  const pct = Math.max(4, Math.min(100, 100 - (dias / 30) * 100));
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
  const criticas7  = POLIZAS_CRITICAS.filter((p) => p.dias <= 7).length;
  const urgentes15 = POLIZAS_CRITICAS.filter((p) => p.dias > 7 && p.dias <= 15).length;
  const proximas30 = POLIZAS_CRITICAS.filter((p) => p.dias > 15 && p.dias <= 30).length;
  const totalSemanales = VENCIMIENTOS_SEMANALES.reduce((s, d) => s + d.vencen, 0);

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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/25 rounded-xl px-4 py-2.5">
              <AlertTriangle size={14} className="text-red-400" />
              <div>
                <p className="text-[10px] text-red-300 uppercase tracking-wide font-semibold">Atención inmediata</p>
                <p className="text-sm font-bold text-red-200">{criticas7} pólizas vencen en ≤ 7 días</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={AlertTriangle}
          label="Críticas (≤ 7 días)"
          value={criticas7}
          sublabel="Requieren acción inmediata"
          accent="text-red-600"
          bg="bg-red-500"
          border="border-red-100"
        />
        <KpiCard
          icon={CalendarClock}
          label="Urgentes (8-15 días)"
          value={urgentes15}
          sublabel="Gestión prioritaria"
          accent="text-amber-600"
          bg="bg-amber-500"
          border="border-amber-100"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Próximas (16-30 días)"
          value={proximas30}
          sublabel="En seguimiento"
          accent="text-blue-600"
          bg="bg-blue-600"
          border="border-blue-100"
        />
        <KpiCard
          icon={Activity}
          label="Total próx. 8 semanas"
          value={totalSemanales}
          sublabel="Pólizas a gestionar"
          accent="text-gray-800"
          bg="bg-[#CC6628]"
          border="border-orange-100"
        />
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
              May — Jul 2026
            </span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={VENCIMIENTOS_SEMANALES} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="semana"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                width={28}
                allowDecimals={false}
              />
              <Tooltip content={<TooltipBarra />} cursor={{ fill: "#f9fafb" }} />
              <Bar
                dataKey="vencen"
                name="Pólizas"
                radius={[7, 7, 0, 0]}
                maxBarSize={44}
              >
                {VENCIMIENTOS_SEMANALES.map((entry) => (
                  <Cell
                    key={entry.semana}
                    fill={entry.vencen >= 7 ? "#CC6628" : entry.vencen >= 5 ? "#d97706" : "#93c5fd"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Leyenda de colores */}
          <div className="flex items-center gap-5 mt-3 justify-end text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#CC6628" }} />Alta carga (≥ 7)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />Media (5-6)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300" />Baja (≤ 4)</span>
          </div>
        </div>

        {/* Torta: distribución por tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Composición</p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">Por tipo de garantía</h2>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={DISTRIBUCION_TIPO}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
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
          <div className="mt-4 space-y-2">
            {DISTRIBUCION_TIPO.map((d) => {
              const total = DISTRIBUCION_TIPO.reduce((s, x) => s + x.value, 0);
              return (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{d.value}</span>
                    <span className="text-gray-400 w-7 text-right">{Math.round((d.value / total) * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TABLA: PÓLIZAS MÁS URGENTES ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pólizas que requieren gestión inmediata</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ordenadas por proximidad al vencimiento</p>
          </div>
          <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
            {criticas7} críticas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {["N.° Póliza", "Tipo", "Aseguradora / Contratista", "Valor asegurado", "Vencimiento", "Urgencia"].map((col) => (
                  <th key={col} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {POLIZAS_CRITICAS.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors group">

                  {/* Póliza */}
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-bold text-gray-800 group-hover:text-[#CC6628] transition-colors">
                      {p.numero}
                    </span>
                  </td>

                  {/* Tipo */}
                  <td className="px-5 py-4">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg font-medium">
                      {TIPO_LABEL[p.tipo] ?? p.tipo}
                    </span>
                  </td>

                  {/* Aseguradora / Contratista */}
                  <td className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-800">{p.aseguradora}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{p.contratista}</p>
                  </td>

                  {/* Valor */}
                  <td className="px-5 py-4 font-semibold text-xs text-gray-700 whitespace-nowrap">
                    {formatCOP(p.valor)}
                  </td>

                  {/* Fecha vencimiento */}
                  <td className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">{p.vence}</p>
                    <UrgencyBar dias={p.dias} />
                  </td>

                  {/* Badge días */}
                  <td className="px-5 py-4">
                    <BadgeDias dias={p.dias} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Datos actualizados al 20 de mayo de 2026 · Fuente: scheduler diario de IDEXUD
          </p>
          <p className="text-xs text-gray-300">Universidad Distrital Francisco José de Caldas</p>
        </div>
      </div>

    </div>
  );
}
