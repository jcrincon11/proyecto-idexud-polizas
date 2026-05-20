// src/pages/Polizas/PolizaDetail.jsx
// Vista de detalle con:
//   - Cabecera prominente con N° Póliza, N° Proyecto y Centro de Costos
//   - Botón NextCloud llamativo
//   - Checklist condicional por rol y estado
//   - Indicador visual del flujo de estados

import React, { useState } from "react";
import { toast } from "sonner";
import { useAuth, LABEL_ESTADO, COLOR_ESTADO } from "../../context/AuthContext";

// ── Componente: Botón NextCloud ────────────────────────────────────
export function NextcloudButton({ enlace, compact = false }) {
  const [hovered, setHovered] = useState(false);

  if (!enlace) return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "8px",
      padding: "8px 14px", borderRadius: "10px",
      background: "#F8FAFC", border: "1.5px dashed #CBD5E1",
      color: "#94A3B8", fontSize: "13px",
    }}>
      🗂 Sin carpeta NextCloud
    </div>
  );

  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? "8px" : "10px",
        padding: compact ? "8px 16px" : "12px 20px",
        borderRadius: "12px",
        background: hovered
          ? "linear-gradient(135deg, #1744B0 0%, #0F2D8A 100%)"
          : "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
        color: "#fff",
        textDecoration: "none",
        fontSize: compact ? "13px" : "14px",
        fontWeight: 600,
        boxShadow: hovered
          ? "0 8px 24px rgba(37,99,235,0.45)"
          : "0 4px 12px rgba(37,99,235,0.3)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: compact ? "16px" : "18px" }}>🗂</span>
      {compact ? "Abrir" : "Abrir en NextCloud"}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.85 }}>
        <path d="M2.5 7H11.5M8 3.5L11.5 7L8 10.5" stroke="white" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  );
}

// ── Mapa de checklist por estado y rol ────────────────────────────
const CHECKLIST_CONFIG = {
  SOLICITUD_PMO: {
    titulo: "Revisión PMO",
    items: [
      { id: "verificar_docs",   label: "Documentación completa",    rol: "PMO",       icono: "📋" },
      { id: "verificar_budget", label: "Presupuesto disponible",    rol: "PMO",       icono: "💰" },
      { id: "aprobar_solicitud",label: "Aprobar solicitud",         rol: "PMO",       icono: "✅" },
    ],
  },
  JURIDICA_ANALISIS: {
    titulo: "Análisis Jurídico",
    items: [
      { id: "revision_minuta",  label: "Revisar minuta del contrato", rol: "JURIDICA", icono: "📝" },
      { id: "centro_costos",    label: "Registrar centro de costos",  rol: "JURIDICA", icono: "🏷" },
      { id: "contacto_aseg",    label: "Contactar aseguradora",       rol: "JURIDICA", icono: "📞" },
      { id: "envio_borrador",   label: "Enviar borrador a aseg.",     rol: "JURIDICA", icono: "📤" },
    ],
  },
  EMITIDA: {
    titulo: "Emisión",
    items: [
      { id: "recepcion_poliza", label: "Recepción de póliza",     rol: "JURIDICA",   icono: "📬" },
      { id: "validar_clausulas",label: "Validar cláusulas",       rol: "JURIDICA",   icono: "🔍" },
      { id: "cargar_nextcloud", label: "Cargar a NextCloud",      rol: "JURIDICA",   icono: "☁️" },
      { id: "prog_pago",        label: "Programar pago de prima", rol: "FINANCIERA", icono: "📅" },
    ],
  },
  PAGADA: {
    titulo: "Pago y Cierre",
    items: [
      { id: "verificar_pago",   label: "Verificar transferencia",  rol: "FINANCIERA", icono: "🏦" },
      { id: "registro_contable",label: "Registro contable",        rol: "FINANCIERA", icono: "📊" },
      { id: "calculo_reintegro",label: "Calcular reintegro",       rol: "FINANCIERA", icono: "🔄" },
    ],
  },
};

const ESTADOS_FLUJO = [
  "BORRADOR", "SOLICITUD_PMO", "JURIDICA_ANALISIS", "EMITIDA", "PAGADA", "REINTEGRADA",
];

// ── Componente: Badge de estado ───────────────────────────────────
function EstadoBadge({ estado }) {
  const colores = COLOR_ESTADO[estado] ?? { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "4px 12px",
      borderRadius: "99px",
      background: colores.bg,
      color: colores.text,
      border: `1px solid ${colores.border}`,
      fontSize: "12px",
      fontWeight: 600,
      letterSpacing: "0.02em",
    }}>
      <span style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: colores.text, flexShrink: 0,
      }} />
      {LABEL_ESTADO[estado] ?? estado}
    </span>
  );
}

// ── Componente: Item de checklist ─────────────────────────────────
function ChecklistItem({ item, completado, bloqueado, onToggle }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "10px",
        background: completado ? "#F0FDF4" : hovered && !bloqueado ? "#F8FAFC" : "#fff",
        border: `1.5px solid ${completado ? "#86EFAC" : "#E2E8F0"}`,
        transition: "all 0.15s",
        cursor: bloqueado ? "not-allowed" : "pointer",
        opacity: bloqueado ? 0.5 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !bloqueado && onToggle(item.id)}
    >
      {/* Checkbox */}
      <div style={{
        width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
        border: `2px solid ${completado ? "#16A34A" : "#CBD5E1"}`,
        background: completado ? "#16A34A" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}>
        {completado && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <span style={{ fontSize: "18px", flexShrink: 0 }}>{item.icono}</span>

      <span style={{
        flex: 1,
        fontSize: "14px",
        fontWeight: completado ? 400 : 500,
        color: completado ? "#16A34A" : "#334155",
        textDecoration: completado ? "line-through" : "none",
      }}>
        {item.label}
      </span>

      {/* Badge de rol */}
      <span style={{
        fontSize: "10px",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "99px",
        background: item.rol === "PMO" ? "#DBEAFE"
                  : item.rol === "JURIDICA" ? "#EDE9FE"
                  : "#D1FAE5",
        color: item.rol === "PMO" ? "#1D4ED8"
             : item.rol === "JURIDICA" ? "#6D28D9"
             : "#065F46",
        letterSpacing: "0.04em",
        flexShrink: 0,
      }}>
        {item.rol}
      </span>

      {bloqueado && (
        <span style={{ fontSize: "14px", flexShrink: 0 }} title="Sin permiso para este estado">🔒</span>
      )}
    </div>
  );
}

// ── PolizaDetail — componente principal ───────────────────────────
export default function PolizaDetail({ poliza, onTransicionar, onGuardar }) {
  const { usuario } = useAuth();
  const [checklistEstado, setChecklistEstado] = useState({});

  // Datos de demo si no se pasa poliza real
  const p = poliza ?? {
    id: 42,
    numero_poliza: "POL-2024-0087",
    numero_proyecto: "PRY-INF-2024-003",
    centro_de_costos: "CC-2024-INFRA-001",
    descripcion: "Póliza de cumplimiento para contrato de construcción del edificio institucional sede norte.",
    tipo_garantia: "POLIZA_CUMPLIMIENTO",
    estado: "JURIDICA_ANALISIS",
    aseguradora: "Seguros Sura S.A.",
    valor_prima: 12500000,
    enlace_nextcloud: "https://nextcloud.empresa.com/s/poliza-pry-003",
    fecha_inicio_vigencia: "2024-03-01",
    fecha_fin_vigencia: "2025-03-01",
    monto_asegurado: 850000000,
    solicitante_id: 1,
  };

  const estadoActual = p.estado;
  const idxEstado = ESTADOS_FLUJO.indexOf(estadoActual);
  const checklistActual = CHECKLIST_CONFIG[estadoActual];

  const toggleItem = (itemId) => {
    const completando = !checklistEstado[itemId];
    const item = checklistActual?.items.find((i) => i.id === itemId);
    setChecklistEstado((prev) => ({ ...prev, [itemId]: completando }));
    if (completando) {
      toast.success(`${item?.icono ?? "✓"} ${item?.label ?? "Paso completado"}`, {
        description: `Marcado por: ${usuario.nombre} (${usuario.rol})`,
        duration: 2500,
      });
    } else {
      toast(`${item?.label ?? "Paso"} desmarcado`, {
        description: "El paso volvió a estado pendiente.",
        duration: 2000,
      });
    }
  };

  const puedeTogglearItem = (item) => {
    if (usuario.rol === "ADMIN") return true;
    return item.rol === usuario.rol;
  };

  const fmt = (n) => n
    ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
    : "—";

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Cabecera principal ─────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        borderRadius: "20px",
        padding: "32px",
        color: "#fff",
        marginBottom: "24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Patrón decorativo */}
        <div style={{
          position: "absolute", right: "-40px", top: "-40px",
          width: "220px", height: "220px", borderRadius: "50%",
          border: "40px solid rgba(255,255,255,0.04)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", right: "40px", top: "40px",
          width: "120px", height: "120px", borderRadius: "50%",
          border: "30px solid rgba(255,255,255,0.04)",
          pointerEvents: "none",
        }} />

        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
          <EstadoBadge estado={estadoActual} />
          <NextcloudButton enlace={p.enlace_nextcloud} compact />
        </div>

        {/* Número de póliza — dato más prominente */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600,
                        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
            Número de Póliza
          </div>
          <div style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em",
                        fontVariantNumeric: "tabular-nums" }}>
            {p.numero_poliza ?? <span style={{ color: "#475569" }}>Pendiente de emisión</span>}
          </div>
        </div>

        {/* Grid de datos clave */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <MetaDato
            label="Número de Proyecto"
            valor={p.numero_proyecto ?? "—"}
            icono="🏗"
          />
          <MetaDato
            label="Centro de Costos"
            valor={p.centro_de_costos ?? (
              <span style={{ color: "#F59E0B", fontSize: "12px" }}>
                ⚠ Pendiente · Requerido en análisis jurídico
              </span>
            )}
            icono="🏷"
          />
          <MetaDato
            label="Monto Asegurado"
            valor={fmt(p.monto_asegurado)}
            icono="💼"
          />
        </div>
      </div>

      {/* ── Indicador de progreso ──────────────────────────────── */}
      <div style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: "16px",
        padding: "20px 24px",
        marginBottom: "24px",
      }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8",
                      letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
          Flujo de trabajo
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {ESTADOS_FLUJO.map((estado, i) => {
            const pasado = i < idxEstado;
            const actual = i === idxEstado;
            const futuro = i > idxEstado;
            const colores = COLOR_ESTADO[estado] ?? { bg: "#F1F5F9", text: "#94A3B8" };
            return (
              <React.Fragment key={estado}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700,
                    background: pasado ? "#16A34A" : actual ? colores.text : "#E2E8F0",
                    color: pasado || actual ? "#fff" : "#94A3B8",
                    border: actual ? `2px solid ${colores.text}` : "none",
                    boxShadow: actual ? `0 0 0 4px ${colores.bg}` : "none",
                    transition: "all 0.2s",
                  }}>
                    {pasado ? "✓" : i + 1}
                  </div>
                  <div style={{
                    marginTop: "6px",
                    fontSize: "9px",
                    fontWeight: actual ? 700 : 400,
                    color: actual ? colores.text : pasado ? "#16A34A" : "#94A3B8",
                    textAlign: "center",
                    letterSpacing: "0.02em",
                  }}>
                    {LABEL_ESTADO[estado]?.split(" ")[0]}
                  </div>
                </div>
                {i < ESTADOS_FLUJO.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: "2px",
                    background: pasado ? "#16A34A" : "#E2E8F0",
                    marginBottom: "18px",
                    transition: "background 0.3s",
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Info de la póliza ──────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "16px", marginBottom: "24px",
      }}>
        <InfoCard titulo="Detalles de la Garantía">
          <InfoRow label="Tipo" valor={p.tipo_garantia?.replace(/_/g, " ")} />
          <InfoRow label="Aseguradora" valor={p.aseguradora ?? "Por definir"} />
          <InfoRow label="Inicio vigencia" valor={p.fecha_inicio_vigencia ?? "—"} />
          <InfoRow label="Fin vigencia" valor={p.fecha_fin_vigencia ?? "—"} />
        </InfoCard>

        <InfoCard titulo="Datos Financieros">
          <InfoRow label="Valor prima" valor={fmt(p.valor_prima)} />
          <InfoRow label="Prima pagada" valor={fmt(p.valor_prima_pagada)} />
          <InfoRow label="Reintegro" valor={fmt(p.valor_reintegro)} />
          <InfoRow label="N° Póliza borrador" valor={p.numero_poliza_borrador ?? "—"} />
        </InfoCard>
      </div>

      {/* ── Enlace NextCloud prominente ────────────────────────── */}
      <div style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: "16px",
        padding: "20px 24px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
            Carpeta de documentos
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px",
                        fontFamily: "monospace", wordBreak: "break-all" }}>
            {p.enlace_nextcloud ?? "Sin enlace registrado"}
          </div>
        </div>
        <NextcloudButton enlace={p.enlace_nextcloud} />
      </div>

      {/* ── Checklist condicional ──────────────────────────────── */}
      {checklistActual ? (
        <div style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8",
                            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
                Checklist
              </div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
                {checklistActual.titulo}
              </h3>
            </div>
            {/* Progreso */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A" }}>
                {checklistActual.items.filter((it) => checklistEstado[it.id]).length}
                <span style={{ fontSize: "14px", color: "#94A3B8", fontWeight: 400 }}>
                  /{checklistActual.items.length}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>completados</div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{
            height: "6px", borderRadius: "99px", background: "#F1F5F9",
            marginBottom: "20px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: "99px", background: "#16A34A",
              width: `${(checklistActual.items.filter((it) => checklistEstado[it.id]).length / checklistActual.items.length) * 100}%`,
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {checklistActual.items.map((item) => {
              const puede = puedeTogglearItem(item);
              return (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  completado={!!checklistEstado[item.id]}
                  bloqueado={!puede}
                  onToggle={toggleItem}
                />
              );
            })}
          </div>

          {/* Aviso si el rol no tiene items aquí */}
          {!checklistActual.items.some(puedeTogglearItem) && (
            <div style={{
              marginTop: "16px",
              padding: "12px 16px",
              borderRadius: "10px",
              background: "#FFF7ED",
              border: "1px solid #FED7AA",
              color: "#92400E",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span>⚠️</span>
              Tu rol <strong>{usuario.rol}</strong> no tiene tareas asignadas en esta etapa.
              Los elementos están bloqueados.
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: "24px",
          borderRadius: "16px",
          background: "#F8FAFC",
          border: "1.5px dashed #CBD5E1",
          textAlign: "center",
          color: "#94A3B8",
          fontSize: "14px",
        }}>
          No hay checklist activo para el estado <strong>{LABEL_ESTADO[estadoActual]}</strong>.
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────

function MetaDato({ label, valor, icono }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 600,
                    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
        {icono} {label}
      </div>
      <div style={{ fontSize: "15px", fontWeight: 600, color: "#F8FAFC", wordBreak: "break-word" }}>
        {valor}
      </div>
    </div>
  );
}

function InfoCard({ titulo, children }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E2E8F0",
      borderRadius: "16px",
      padding: "20px",
    }}>
      <h4 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700,
                   color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {titulo}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, valor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: "13px", gap: "12px" }}>
      <span style={{ color: "#94A3B8", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#0F172A", fontWeight: 500, textAlign: "right", wordBreak: "break-all" }}>
        {valor}
      </span>
    </div>
  );
}
