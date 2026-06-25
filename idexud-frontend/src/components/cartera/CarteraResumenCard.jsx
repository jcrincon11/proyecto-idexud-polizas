// src/components/cartera/CarteraResumenCard.jsx
// Tarjeta de resumen financiero de cartera para un corredor.
// Recibe datos desde GET /api/v1/cartera/resumen via hook useCarteraResumen.

import { Clock, CheckCircle2, Minus, TrendingUp, Briefcase } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const PALETTE = [
  { base: "#1A73E8", light: "#EFF6FF" },
  { base: "#0EA5E9", light: "#F0F9FF" },
  { base: "#7C3AED", light: "#F5F3FF" },
  { base: "#059669", light: "#ECFDF5" },
  { base: "#D97706", light: "#FFFBEB" },
  { base: "#DC2626", light: "#FEF2F2" },
  { base: "#0891B2", light: "#ECFEFF" },
  { base: "#BE185D", light: "#FDF2F8" },
];

function colorDeEmpresa(empresa = "") {
  let h = 0;
  for (let i = 0; i < empresa.length; i++) {
    h = Math.imul(31, h) + empresa.charCodeAt(i) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function formatCOP(valor) {
  const n = parseFloat(valor ?? 0);
  if (n === 0) return "$ 0";
  if (n >= 1_000_000_000)
    return `$ ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} B`;
  if (n >= 1_000_000)
    return `$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} M`;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function CarteraResumenSkeleton() {
  const shimmer = { background: "#F1F5F9", borderRadius: 8 };
  return (
    <div style={{
      background: "#fff", border: "1.5px solid #E2E8F0",
      borderRadius: 20, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg,#E2E8F0,#F8FAFC)" }} />
      <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, ...shimmer, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, ...shimmer, width: "60%", marginBottom: 6 }} />
            <div style={{ height: 11, ...shimmer, width: "40%", background: "#F8FAFC" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 64, ...shimmer, borderRadius: 12 }} />
          ))}
        </div>
        <div style={{ height: 6, ...shimmer, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ── Chip de estadística financiera ───────────────────────────────────────────
function StatChip({ label, valor, IconComponent, chipColor, chipBg }) {
  return (
    <div style={{
      padding: "10px 12px",
      background: chipBg,
      borderRadius: 12,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <IconComponent size={11} style={{ color: chipColor, flexShrink: 0 }} />
        <span style={{
          fontSize: 9, fontWeight: 700, color: chipColor,
          letterSpacing: "0.07em", textTransform: "uppercase",
        }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
        {formatCOP(valor)}
      </span>
    </div>
  );
}

// ── Card principal ────────────────────────────────────────────────────────────
export default function CarteraResumenCard({ item }) {
  const {
    corredor_empresa,
    corredor_nombre,
    total_polizas,
    total_pendiente,
    total_abonado,
    total_pagado,
    total_cartera,
    pct_pagado,
    pct_gestionado,
  } = item;

  const { base: color, light: colorLight } = colorDeEmpresa(corredor_empresa);
  const inicial = corredor_empresa.charAt(0).toUpperCase();

  // Segmentos de la barra (pendiente / abonado / pagado)
  const totalNum    = parseFloat(total_cartera ?? 0);
  const pagadoNum   = parseFloat(total_pagado  ?? 0);
  const abonadoNum  = parseFloat(total_abonado ?? 0);
  const pctPagado   = totalNum > 0 ? (pagadoNum  / totalNum) * 100 : 0;
  const pctAbonado  = totalNum > 0 ? (abonadoNum / totalNum) * 100 : 0;

  const estadoLabel =
    pct_pagado >= 100
      ? { text: "Saldada", color: "#059669", bg: "#ECFDF5" }
      : pct_gestionado > 50
      ? { text: "En curso",  color: "#0891B2", bg: "#ECFEFF" }
      : { text: "Pendiente", color: "#D97706", bg: "#FFFBEB" };

  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #E8EDF2",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      display: "flex", flexDirection: "column",
      transition: "box-shadow 0.2s ease, transform 0.2s ease",
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 12px 32px -6px ${color}28, 0 2px 8px rgba(0,0,0,0.06)`;
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Barra de acento superior */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${color}, ${color}60)`,
        flexShrink: 0,
      }} />

      <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── Cabecera ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 48, height: 48, borderRadius: 13, flexShrink: 0,
            background: `linear-gradient(145deg, ${color}, ${color}AA)`,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800,
            boxShadow: `0 3px 10px ${color}30`,
          }}>
            {inicial}
          </div>

          {/* Empresa + corredor */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: "0 0 2px",
              fontSize: 13, fontWeight: 700, color: "#0F172A",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {corredor_empresa}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Briefcase size={10} style={{ color: "#94A3B8", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {corredor_nombre}
              </span>
            </div>
          </div>

          {/* Badge estado + # pólizas */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: estadoLabel.color,
              background: estadoLabel.bg, padding: "2px 8px",
              borderRadius: 99, whiteSpace: "nowrap",
            }}>
              {estadoLabel.text}
            </span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>
              {total_polizas} {total_polizas === 1 ? "póliza" : "pólizas"}
            </span>
          </div>
        </div>

        {/* ── Chips de montos ───────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <StatChip
            label="Pendiente"
            valor={total_pendiente}
            IconComponent={Clock}
            chipColor="#B45309"
            chipBg="#FFFBEB"
          />
          <StatChip
            label="Abonado"
            valor={total_abonado}
            IconComponent={Minus}
            chipColor="#0369A1"
            chipBg="#F0F9FF"
          />
          <StatChip
            label="Pagado"
            valor={total_pagado}
            IconComponent={CheckCircle2}
            chipColor="#059669"
            chipBg="#ECFDF5"
          />
        </div>

        {/* ── Barra de progreso segmentada ──────────────────────────────────── */}
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 7,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <TrendingUp size={11} style={{ color: "#94A3B8" }} />
              <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
                Progreso de cobro
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>
              {pct_gestionado}
              <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: 10 }}>% gestionado</span>
            </span>
          </div>

          {/* Barra tricolor: pagado | abonado | pendiente */}
          <div style={{
            height: 7, borderRadius: 99, background: "#F1F5F9",
            overflow: "hidden", display: "flex",
          }}>
            {/* Segmento pagado (verde) */}
            {pctPagado > 0 && (
              <div style={{
                width: `${pctPagado}%`, height: "100%",
                background: "#10B981", transition: "width 0.6s ease",
                borderRadius: pctAbonado === 0 ? 99 : "99px 0 0 99px",
              }} />
            )}
            {/* Segmento abonado (azul) */}
            {pctAbonado > 0 && (
              <div style={{
                width: `${pctAbonado}%`, height: "100%",
                background: "#38BDF8", transition: "width 0.6s ease",
                borderRadius: pctPagado === 0 ? "99px 0 0 99px" : 0,
              }} />
            )}
          </div>

          {/* Leyenda de colores */}
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            {[
              { color: "#10B981", label: `Pagado ${pct_pagado}%` },
              { color: "#38BDF8", label: `Abonado ${Math.round(pctAbonado)}%` },
              { color: "#F1F5F9", label: "Pendiente", border: "1px solid #E2E8F0" },
            ].map(({ color: c, label, border }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 99,
                  background: c, border, flexShrink: 0,
                }} />
                <span style={{ fontSize: 10, color: "#94A3B8" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Total de cartera ──────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px", background: "#F8FAFC", borderRadius: 12,
        }}>
          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>
            Total cartera
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
            {formatCOP(total_cartera)}
          </span>
        </div>

      </div>
    </div>
  );
}
