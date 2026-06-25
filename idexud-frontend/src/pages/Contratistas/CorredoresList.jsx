// src/pages/Corredores/CorredoresList.jsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { polizasApi } from "../../services/api";
import DashboardHeader from "../../components/layout/DashboardHeader";

const T = {
  indigo: "#1E1B4B", indigoMid: "#312E81", indigoLight: "#4338CA",
  violet: "#7C3AED", violetPale: "#EDE9FE",
  gold: "#D97706", goldPale: "#FEF3C7",
  slate: "#64748B", slateLight: "#94A3B8",
  border: "#E2E8F0", bg: "#F8F7FF", white: "#FFFFFF",
  red: "#DC2626", redPale: "#FEF2F2",
};

const GRADIENTES = [
  ["#1E1B4B", "#4338CA"], ["#312E81", "#7C3AED"], ["#0C4A6E", "#0891B2"],
  ["#064E3B", "#059669"], ["#7F1D1D", "#DC2626"], ["#451A03", "#D97706"],
  ["#1A1A2E", "#6B21A8"], ["#0F172A", "#334155"],
];
const grad = nombre => GRADIENTES[(nombre || "?").charCodeAt(0) % GRADIENTES.length];

function Logo({ nombre, dominio, size = 52 }) {
  const [err, setErr] = useState(!dominio);
  const ini = (nombre || "?")[0].toUpperCase();
  const [c1, c2] = grad(nombre);

  if (!err && dominio) return (
    <div style={{ width: size, height: size, borderRadius: "14px", overflow: "hidden", flexShrink: 0, background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={`https://logo.clearbit.com/${dominio}`} alt={nombre} onError={() => setErr(true)} style={{ width: "80%", height: "80%", objectFit: "contain" }} />
    </div>
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "14px", flexShrink: 0, background: `linear-gradient(135deg,${c1},${c2})`, boxShadow: `0 6px 16px ${c1}55`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * .4, color: "#fff", fontFamily: "'Georgia',serif" }}>
      {ini}
    </div>
  );
}

function StatBox({ valor, label, color }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: "10px", background: T.bg, textAlign: "center" }}>
      <div style={{ fontSize: "20px", fontWeight: 800, color, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: "10px", color: T.slateLight, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

function PolizasModal({ corredor, onCerrar }) {
  const [polizas, setPolizas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    polizasApi
      .listar({ corredor_id: corredor.id, por_pagina: 100 })
      .then(({ data }) => { if (activo) { setPolizas(data.items ?? []); setCargando(false); } })
      .catch(() => { if (activo) { setError("No se pudieron cargar las pólizas."); setCargando(false); } });
    return () => { activo = false; };
  }, [corredor.id]);

  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onCerrar]);

  const COL = {
    ACTIVA:              { bg: "#D1FAE5", t: "#065F46" },
    POR_VENCER:          { bg: "#FEF3C7", t: "#92400E" },
    VENCIDA:             { bg: "#FEE2E2", t: "#991B1B" },
    BORRADOR:            { bg: "#F1F5F9", t: "#475569" },
    PENDIENTE_REVISION:  { bg: "#DBEAFE", t: "#1D4ED8" },
    RENOVADA:            { bg: "#EDE9FE", t: "#5B21B6" },
    ANULADA:             { bg: "#F1F5F9", t: "#6B7280" },
  };

  return (
    <div ref={overlayRef} onClick={(e) => e.target === overlayRef.current && onCerrar()} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(11,25,41,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "fadeIn 0.2s ease" }}>
      <div style={{ background: T.white, borderRadius: "20px", width: "100%", maxWidth: "640px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 80px rgba(0,0,0,0.28)", animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "22px 28px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
          <Logo nombre={corredor.nombre} dominio={corredor.dominio} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "10px", color: T.slateLight, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Pólizas vinculadas {!cargando && `· ${polizas.length}`}
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 700, color: T.indigo }}>{corredor.nombre}</h2>
          </div>
          <button onClick={onCerrar} style={{ width: "30px", height: "30px", border: `1px solid ${T.border}`, borderRadius: "7px", background: "none", cursor: "pointer", color: T.slate, fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Lista con scroll vertical */}
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 28px" }}>
          {cargando ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: "68px", borderRadius: "12px", background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px", color: T.red, fontSize: "14px" }}>{error}</div>
          ) : polizas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: T.slateLight, fontSize: "15px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div> No hay pólizas vinculadas aún.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {polizas.map(p => {
                const c = COL[p.estado] ?? COL.BORRADOR;
                return (
                  <div key={p.id} style={{ padding: "14px 16px", borderRadius: "11px", border: `1.5px solid ${T.border}`, display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "center", transition: "border-color 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = T.violet} onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: T.indigo, fontFamily: "monospace" }}>{p.numero_poliza || "Sin número"}</span>
                        <span style={{ padding: "2px 7px", borderRadius: "99px", background: c.bg, color: c.t, fontSize: "10px", fontWeight: 700 }}>{p.estado}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: T.slate }}>{p.numero_contrato || p.objeto_contrato || "—"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: T.indigo }}>{p.valor_asegurado_fmt || "—"}</div>
                      <div style={{ fontSize: "11px", color: T.slateLight }}>Hasta {p.vigencia_hasta || "—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 28px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onCerrar} style={{ padding: "8px 18px", border: `1.5px solid ${T.border}`, borderRadius: "9px", background: T.white, color: T.slate, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function CorredorCard({ corredor, onVerPolizas, onEditar, onEliminar }) {
  const [hov, setHov] = useState(false);
  const [conf, setConf] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setConf(false); }} style={{ background: T.white, border: `1.5px solid ${hov ? T.violet : T.border}`, borderRadius: "18px", overflow: "hidden", transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform: hov ? "translateY(-4px)" : "translateY(0)", boxShadow: hov ? `0 20px 48px rgba(30,27,75,0.14),0 0 0 1px ${T.violet}25` : "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "5px", background: `linear-gradient(90deg,${T.indigo},${T.violet})`, opacity: hov ? 1 : 0.35, transition: "opacity 0.3s" }} />
      <div style={{ padding: "20px 20px 16px", flex: 1 }}>
        <div style={{ display: "flex", gap: "14px", marginBottom: "16px" }}>
          <Logo nombre={corredor.nombre} dominio={corredor.dominio} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: T.indigo, lineHeight: 1.25, marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{corredor.nombre}</div>
            {corredor.nit && <div style={{ fontSize: "11px", color: T.slateLight, fontFamily: "monospace", letterSpacing: "0.04em" }}>NIT {corredor.nit}</div>}
          </div>
        </div>
        <div style={{ borderTop: `1.5px dashed ${T.border}`, margin: "0 0 14px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <StatBox valor={corredor.polizas_gestionadas ?? 0} label="Gestionadas" color={T.violet} />
          <StatBox valor={corredor.polizas_activas ?? 0} label="Activas" color={T.gold} />
        </div>
      </div>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: "8px", background: hov ? "#FAFAFF" : T.white, transition: "background 0.2s" }}>
        <button onClick={() => onVerPolizas(corredor)} style={{ flex: 1, padding: "8px 0", border: `1.5px solid ${T.violet}`, borderRadius: "9px", background: "none", color: T.violet, fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = T.violet; e.currentTarget.style.color = T.white; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = T.violet; }}>Ver pólizas</button>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL (CON BACKEND REAL) ────────────────────────
export default function CorredoresList({ onGuardar, onEliminar }) {
  const [corredores, setCorredores] = useState([]);
  const [cargando, setCargando] = useState(true);

  // FETCH AL BACKEND REAL
  useEffect(() => {
    const fetchCorredores = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/corredores");
        const data = await res.json();

        // Mapeamos los datos de la BD a lo que espera la tarjeta visual
        const formateados = data.map(c => ({
          ...c,
          nombre: c.nombre_razon_social,
          nit: c.numero_identificacion
        }));

        setCorredores(formateados);
      } catch (err) {
        console.error("Error cargando corredores:", err);
      } finally {
        setCargando(false);
      }
    };
    fetchCorredores();
  }, []);

  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("polizas");
  const [modalPol, setModalPol] = useState(null);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let lista = q ? corredores.filter(c => c.nombre.toLowerCase().includes(q) || (c.nit || "").includes(q)) : [...corredores];
    if (orden === "polizas") lista.sort((a, b) => (b.polizas_gestionadas || 0) - (a.polizas_gestionadas || 0));
    if (orden === "activas") lista.sort((a, b) => (b.polizas_activas || 0) - (a.polizas_activas || 0));
    if (orden === "nombre") lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return lista;
  }, [corredores, busqueda, orden]);

  const total = corredores.reduce((s, c) => s + (c.polizas_gestionadas || 0), 0);

  if (cargando) return <div style={{ padding: "40px", textAlign: "center", color: T.slate }}>Cargando Corredores...</div>;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 24px", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <DashboardHeader
        title="Corredores"
        subtitle="Intermediarios de seguros vinculados a las pólizas del IDEXUD."
        breadcrumb="IDEXUD · Corredores"
        accent="#8B5CF6"
        accent2="#6366F1"
        stats={[
          { label: 'INTERMEDIARIOS', value: cargando ? null : corredores.length, desc: 'Corredores registrados' },
          { label: 'PÓLIZAS',        value: cargando ? null : total,              desc: 'Gestionadas en total'  },
        ]}
      />
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.45, fontSize: "15px" }}>🔍</span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre o NIT…" style={{ width: "100%", padding: "10px 14px 10px 38px", border: `1.5px solid ${T.border}`, borderRadius: "10px", fontSize: "13px", color: T.indigo, background: T.white, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={orden} onChange={e => setOrden(e.target.value)} style={{ padding: "10px 34px 10px 12px", border: `1.5px solid ${T.border}`, borderRadius: "10px", fontSize: "13px", color: T.slate, background: T.white, cursor: "pointer", outline: "none", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
          <option value="polizas">Más pólizas primero</option>
          <option value="activas">Más activas primero</option>
          <option value="nombre">Nombre A → Z</option>
        </select>
      </div>
      {filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", color: T.slateLight, fontSize: "16px", border: `2px dashed ${T.border}`, borderRadius: "16px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div> Sin resultados para "<strong>{busqueda}</strong>"
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "20px" }}>
          {filtrados.map((c, i) => (
            <div key={c.id} style={{ animation: `cardIn 0.28s ${i * 0.05}s ease backwards` }}>
              <CorredorCard corredor={c} onVerPolizas={() => setModalPol(c)} />
            </div>
          ))}
        </div>
      )}
      {modalPol && <PolizasModal corredor={modalPol} onCerrar={() => setModalPol(null)} />}
    </div>
  );
}