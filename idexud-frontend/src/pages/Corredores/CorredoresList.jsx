// src/pages/Corredores/CorredoresList.jsx
// Vista de tarjetas elegantes para corredores/aseguradoras.
// Reemplaza la vista de tabla de contratistas.

import React, { useState, useMemo } from "react";

// ── Datos de demo ─────────────────────────────────────────────────
const CORREDORES_DEMO = [
  {
    id: 1,
    nombre: "Seguros Sura S.A.",
    contacto: "Carlos Mendoza",
    cargo: "Ejecutivo de Cuenta",
    email: "c.mendoza@sura.com.co",
    telefono: "+57 (4) 325 8000",
    polizas_activas: 14,
    polizas_total: 38,
    especialidad: "Cumplimiento · Anticipo",
    logo_inicial: "S",
    color: "#1A73E8",
    rating: 4.8,
    ciudad: "Medellín",
  },
  {
    id: 2,
    nombre: "Allianz Seguros",
    contacto: "Valentina Ríos",
    cargo: "Directora Corporativa",
    email: "v.rios@allianz.com.co",
    telefono: "+57 (1) 745 0800",
    polizas_activas: 9,
    polizas_total: 21,
    especialidad: "Bancaria · Cumplimiento",
    logo_inicial: "A",
    color: "#00B0EA",
    rating: 4.5,
    ciudad: "Bogotá",
  },
  {
    id: 3,
    nombre: "Liberty Seguros",
    contacto: "Marcela Gómez",
    cargo: "Gerente de Cuentas",
    email: "m.gomez@liberty.com.co",
    telefono: "+57 (1) 317 1000",
    polizas_activas: 7,
    polizas_total: 15,
    especialidad: "Calidad · Pago de Salarios",
    logo_inicial: "L",
    color: "#F36F21",
    rating: 4.2,
    ciudad: "Bogotá",
  },
  {
    id: 4,
    nombre: "Mapfre Colombia",
    contacto: "Andrés Peláez",
    cargo: "Asesor Comercial",
    email: "a.pelaez@mapfre.com.co",
    telefono: "+57 (1) 344 5600",
    polizas_activas: 5,
    polizas_total: 12,
    especialidad: "Anticipo · Garantía Única",
    logo_inicial: "M",
    color: "#C4141C",
    rating: 4.0,
    ciudad: "Bogotá",
  },
  {
    id: 5,
    nombre: "Chubb de Colombia",
    contacto: "Isabella Vargas",
    cargo: "VP Grandes Cuentas",
    email: "i.vargas@chubb.com",
    telefono: "+57 (1) 638 5000",
    polizas_activas: 11,
    polizas_total: 29,
    especialidad: "Cumplimiento · Manejo",
    logo_inicial: "C",
    color: "#0033A0",
    rating: 4.7,
    ciudad: "Bogotá",
  },
  {
    id: 6,
    nombre: "Generali Colombia",
    contacto: "Tomás Herrera",
    cargo: "Director Empresarial",
    email: "t.herrera@generali.com.co",
    telefono: "+57 (1) 646 8900",
    polizas_activas: 3,
    polizas_total: 8,
    especialidad: "Responsabilidad Civil",
    logo_inicial: "G",
    color: "#B50000",
    rating: 3.9,
    ciudad: "Medellín",
  },
];

// ── Estrellas de rating ───────────────────────────────────────────
function Stars({ rating }) {
  return (
    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 1L7.39 4.26L11 4.63L8.5 6.97L9.18 10.5L6 8.77L2.82 10.5L3.5 6.97L1 4.63L4.61 4.26L6 1Z"
            fill={n <= Math.floor(rating) ? "#F59E0B" : n - 0.5 <= rating ? "#FCD34D" : "#E2E8F0"}
          />
        </svg>
      ))}
      <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "4px" }}>{rating}</span>
    </div>
  );
}

// ── Card de corredor ──────────────────────────────────────────────
function CorredorCard({ corredor, onVerPolizas, onContactar }) {
  const [hovered, setHovered] = useState(false);
  const pctActivas = Math.round((corredor.polizas_activas / corredor.polizas_total) * 100);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1.5px solid ${hovered ? corredor.color : "#E2E8F0"}`,
        borderRadius: "18px",
        padding: "0",
        overflow: "hidden",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 12px 32px rgba(0,0,0,0.1), 0 0 0 0px ${corredor.color}20`
          : "0 2px 8px rgba(0,0,0,0.04)",
        cursor: "default",
      }}
    >
      {/* Tira de color superior */}
      <div style={{
        height: "5px",
        background: `linear-gradient(90deg, ${corredor.color}, ${corredor.color}99)`,
      }} />

      {/* Cuerpo de la card */}
      <div style={{ padding: "20px" }}>

        {/* Header: logo + nombre + ciudad */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: `linear-gradient(135deg, ${corredor.color}, ${corredor.color}BB)`,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", fontWeight: 800, flexShrink: 0,
            boxShadow: `0 4px 12px ${corredor.color}40`,
          }}>
            {corredor.logo_inicial}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "16px", fontWeight: 700, color: "#0F172A",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {corredor.nombre}
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
              📍 {corredor.ciudad}
            </div>
          </div>

          <Stars rating={corredor.rating} />
        </div>

        {/* Especialidades */}
        <div style={{ marginBottom: "16px" }}>
          {corredor.especialidad.split(" · ").map((esp) => (
            <span key={esp} style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: "99px",
              background: `${corredor.color}12`,
              color: corredor.color,
              border: `1px solid ${corredor.color}30`,
              marginRight: "5px",
              marginBottom: "5px",
              letterSpacing: "0.02em",
            }}>
              {esp}
            </span>
          ))}
        </div>

        {/* Contacto */}
        <div style={{
          padding: "12px 14px",
          background: "#F8FAFC",
          borderRadius: "10px",
          marginBottom: "16px",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
            {corredor.contacto}
          </div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
            {corredor.cargo}
          </div>
          <div style={{ marginTop: "8px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a href={`mailto:${corredor.email}`} style={{
              fontSize: "12px", color: "#2563EB", textDecoration: "none",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              ✉️ {corredor.email}
            </a>
            <a href={`tel:${corredor.telefono}`} style={{
              fontSize: "12px", color: "#2563EB", textDecoration: "none",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              📞 {corredor.telefono}
            </a>
          </div>
        </div>

        {/* Contador de pólizas */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "12px", color: "#64748B", marginBottom: "6px",
          }}>
            <span>Pólizas activas</span>
            <span style={{ fontWeight: 700, color: "#0F172A" }}>
              {corredor.polizas_activas}
              <span style={{ fontWeight: 400, color: "#94A3B8" }}> / {corredor.polizas_total}</span>
            </span>
          </div>
          <div style={{ height: "6px", borderRadius: "99px", background: "#F1F5F9" }}>
            <div style={{
              height: "100%", borderRadius: "99px",
              background: `linear-gradient(90deg, ${corredor.color}, ${corredor.color}BB)`,
              width: `${pctActivas}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px", textAlign: "right" }}>
            {pctActivas}% activas del total histórico
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onVerPolizas?.(corredor)}
            style={{
              flex: 1,
              padding: "9px",
              borderRadius: "10px",
              border: `1.5px solid ${corredor.color}`,
              background: "transparent",
              color: corredor.color,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${corredor.color}12`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Ver {corredor.polizas_activas} pólizas
          </button>
          <button
            onClick={() => onContactar?.(corredor)}
            style={{
              flex: 1,
              padding: "9px",
              borderRadius: "10px",
              border: "none",
              background: corredor.color,
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Contactar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lista principal ───────────────────────────────────────────────
export default function CorredoresList({
  corredores = CORREDORES_DEMO,
  onVerPolizas,
  onNuevoCorredor,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [ordenar, setOrdenar] = useState("activas");

  const corredoresFiltrados = useMemo(() => {
    let lista = corredores.filter((c) => {
      const q = busqueda.toLowerCase();
      return (
        c.nombre.toLowerCase().includes(q) ||
        c.contacto.toLowerCase().includes(q) ||
        c.especialidad.toLowerCase().includes(q) ||
        c.ciudad.toLowerCase().includes(q)
      );
    });

    lista = [...lista].sort((a, b) => {
      if (ordenar === "activas") return b.polizas_activas - a.polizas_activas;
      if (ordenar === "rating")  return b.rating - a.rating;
      if (ordenar === "nombre")  return a.nombre.localeCompare(b.nombre);
      return 0;
    });

    return lista;
  }, [corredores, busqueda, ordenar]);

  const totalActivas = corredores.reduce((s, c) => s + c.polizas_activas, 0);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px",
                  fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header de la página */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: "28px", fontWeight: 800, color: "#0F172A" }}>
              Corredores y Aseguradoras
            </h1>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748B" }}>
              {corredores.length} proveedores ·{" "}
              <strong style={{ color: "#0F172A" }}>{totalActivas}</strong> pólizas activas en total
            </p>
          </div>
          <button
            onClick={onNuevoCorredor}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "10px",
              background: "#0F172A",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "18px" }}>+</span> Nuevo corredor
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap",
      }}>
        {/* Búsqueda */}
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <span style={{
            position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
            fontSize: "16px", pointerEvents: "none",
          }}>🔍</span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, contacto, especialidad..."
            style={{
              width: "100%", padding: "10px 14px 10px 38px",
              border: "1.5px solid #E2E8F0", borderRadius: "10px",
              fontSize: "14px", color: "#0F172A", background: "#fff",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Ordenar */}
        <select
          value={ordenar}
          onChange={(e) => setOrdenar(e.target.value)}
          style={{
            padding: "10px 36px 10px 14px",
            border: "1.5px solid #E2E8F0", borderRadius: "10px",
            fontSize: "14px", color: "#475569", background: "#fff",
            cursor: "pointer", outline: "none",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          <option value="activas">Ordenar: Más activas</option>
          <option value="rating">Ordenar: Mejor rating</option>
          <option value="nombre">Ordenar: Nombre A-Z</option>
        </select>
      </div>

      {/* Grid de cards */}
      {corredoresFiltrados.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          color: "#94A3B8", fontSize: "16px",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
          No se encontraron corredores para "<strong>{busqueda}</strong>"
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px",
        }}>
          {corredoresFiltrados.map((corredor) => (
            <CorredorCard
              key={corredor.id}
              corredor={corredor}
              onVerPolizas={onVerPolizas}
              onContactar={(c) => window.location.href = `mailto:${c.email}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
