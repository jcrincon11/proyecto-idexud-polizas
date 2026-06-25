// src/components/corredores/CorredorCard.jsx
// Tarjeta visual de un corredor de seguros.
// Recibe los datos como props — el consumo de la API ocurre en CorredoresList.

import { useState } from "react";
import { Mail, Phone, Briefcase, User } from "lucide-react";

// ── Paleta de acento asignada por hash del nombre de empresa ─────────────────
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

// ── Skeleton de carga ────────────────────────────────────────────────────────
export function CorredorSkeleton() {
  return (
    <div style={{
      background: "#fff", border: "1.5px solid #E2E8F0",
      borderRadius: 20, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg,#E2E8F0,#F1F5F9)" }} />
      <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* cabecera */}
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#F1F5F9", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 15, background: "#F1F5F9", borderRadius: 6, width: "65%", marginBottom: 7 }} />
            <div style={{ height: 11, background: "#F8FAFC", borderRadius: 6, width: "38%" }} />
          </div>
        </div>
        {/* bloque corredor */}
        <div style={{ height: 78, background: "#F8FAFC", borderRadius: 12 }} />
        {/* barra */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <div style={{ height: 10, background: "#F1F5F9", borderRadius: 4, width: "35%" }} />
            <div style={{ height: 10, background: "#F1F5F9", borderRadius: 4, width: "18%" }} />
          </div>
          <div style={{ height: 5, background: "#F1F5F9", borderRadius: 99 }} />
        </div>
        {/* botones */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, height: 36, background: "#F8FAFC", borderRadius: 10, border: "1.5px solid #E2E8F0" }} />
          <div style={{ flex: 1, height: 36, background: "#E2E8F0", borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}

// ── Fila de contacto segura (no renderiza si value es falsy) ─────────────────
function ContactRow({ IconComponent, value, href, accentColor }) {
  if (!value) return null;
  return (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        fontSize: 12, color: accentColor, textDecoration: "none",
        overflow: "hidden", whiteSpace: "nowrap",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      <IconComponent size={12} style={{ flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </a>
  );
}

// ── Bloque de persona (corredor principal o ayudante) ────────────────────────
function PersonaBlock({ etiqueta, nombre, email, telefono, accentColor, borderLeft }) {
  const hasContact = email || telefono;
  return (
    <div style={{
      padding: "11px 14px",
      background: "#F8FAFC",
      borderRadius: 12,
      borderLeft: borderLeft ? `3px solid ${accentColor}50` : undefined,
    }}>
      {/* Etiqueta */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        marginBottom: 6,
      }}>
        <User size={10} style={{ color: "#94A3B8", flexShrink: 0 }} />
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#94A3B8",
          letterSpacing: "0.07em", textTransform: "uppercase",
        }}>
          {etiqueta}
        </span>
      </div>

      {/* Nombre */}
      <p style={{
        margin: "0 0 7px",
        fontSize: 13, fontWeight: 600, color: "#1E293B",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {nombre}
      </p>

      {/* Datos de contacto */}
      {hasContact && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <ContactRow
            IconComponent={Mail}
            value={email}
            href={`mailto:${email}`}
            accentColor={accentColor}
          />
          <ContactRow
            IconComponent={Phone}
            value={telefono}
            href={`tel:${telefono}`}
            accentColor={accentColor}
          />
        </div>
      )}
    </div>
  );
}

// ── Card principal ───────────────────────────────────────────────────────────
export default function CorredorCard({ corredor, onVerPolizas }) {
  const [hovered, setHovered] = useState(false);
  const { base: color, light: colorLight } = colorDeEmpresa(corredor.empresa);
  const inicial = corredor.empresa.charAt(0).toUpperCase();
  const total   = corredor.polizas_total   || 0;
  const activas = corredor.polizas_activas || 0;
  const pct     = total > 0 ? Math.round((activas / total) * 100) : 0;
  const tieneAyudante = Boolean(corredor.ayudante_nombre);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1.5px solid ${hovered ? color : "#E8EDF2"}`,
        borderRadius: 20,
        overflow: "hidden",
        transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease, border-color 0.18s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 16px 40px -8px ${color}30, 0 4px 12px rgba(0,0,0,0.06)`
          : "0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Barra de acento superior */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${color}, ${color}70)`,
        flexShrink: 0,
      }} />

      <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>

        {/* ── Cabecera ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(145deg, ${color}, ${color}AA)`,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, letterSpacing: -1,
            boxShadow: `0 4px 14px ${color}35`,
          }}>
            {inicial}
          </div>

          {/* Empresa + tipo */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <p style={{
              margin: "0 0 3px",
              fontSize: 14, fontWeight: 700, color: "#0F172A",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              lineHeight: 1.3,
            }}>
              {corredor.empresa}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Briefcase size={10} style={{ color: "#94A3B8", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#94A3B8" }}>
                Corredor de seguros
              </span>
            </div>
          </div>

          {/* Badge "activo" */}
          {corredor.activo !== false && (
            <div style={{
              flexShrink: 0, fontSize: 10, fontWeight: 600,
              color: "#059669", background: "#ECFDF5",
              border: "1px solid #D1FAE5",
              padding: "2px 8px", borderRadius: 99,
              lineHeight: 1.8,
            }}>
              Activo
            </div>
          )}
        </div>

        {/* ── Datos de personas ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PersonaBlock
            etiqueta="Corredor principal"
            nombre={corredor.nombre_corredor}
            email={corredor.email_principal}
            telefono={corredor.telefono_principal}
            accentColor={color}
            borderLeft={false}
          />

          {tieneAyudante && (
            <PersonaBlock
              etiqueta="Contacto de apoyo"
              nombre={corredor.ayudante_nombre}
              email={corredor.email_ayudante}
              telefono={corredor.telefono_ayudante}
              accentColor={color}
              borderLeft
            />
          )}
        </div>

        {/* ── Barra de pólizas ─────────────────────────────────────────────── */}
        <div style={{ marginTop: "auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>Pólizas activas</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
              {activas}
              <span style={{ fontWeight: 400, color: "#94A3B8", fontSize: 11 }}>&thinsp;/&thinsp;{total}</span>
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "#F1F5F9", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: `linear-gradient(90deg, ${color}, ${color}80)`,
              width: `${pct}%`,
              transition: "width 0.6s ease",
            }} />
          </div>
          {total > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 10, color: "#CBD5E1", textAlign: "right" }}>
              {pct}% activas
            </p>
          )}
        </div>

        {/* ── Acciones ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onVerPolizas?.(corredor)}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 10,
              border: `1.5px solid ${color}`,
              background: hovered ? colorLight : "transparent",
              color, fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "background 0.18s",
              whiteSpace: "nowrap",
            }}
          >
            {total > 0 ? `Ver ${total} pólizas` : "Ver pólizas"}
          </button>
          <a
            href={`mailto:${corredor.email_principal}`}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 10,
              border: "none", background: color,
              color: "#fff", fontSize: 12, fontWeight: 600,
              textDecoration: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              transition: "filter 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(0.88)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
          >
            <Mail size={13} />
            Contactar
          </a>
        </div>
      </div>
    </div>
  );
}
