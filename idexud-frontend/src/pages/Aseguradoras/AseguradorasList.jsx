// src/pages/Aseguradoras/AseguradorasList.jsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";

// ── Paleta de colores corporativa ──────────────────────────────────
const TOKENS = {
  navy: "#0B1929",
  navyMid: "#102038",
  navyLight: "#1A3450",
  gold: "#C9963A",
  goldLight: "#E8B55A",
  goldPale: "#FBF0DC",
  slate: "#64748B",
  slateLight: "#94A3B8",
  border: "#E2E8F0",
  borderDark: "#CBD5E1",
  bg: "#F7F9FC",
  white: "#FFFFFF",
  red: "#DC2626",
  redPale: "#FEF2F2",
  green: "#16A34A",
  greenPale: "#F0FDF4",
};

const GRADIENTES_INICIALES = [
  ["#1E3A5F", "#2D6A9F"], ["#5B21B6", "#7C3AED"], ["#065F46", "#059669"],
  ["#92400E", "#D97706"], ["#1E1B4B", "#4338CA"], ["#831843", "#DB2777"],
  ["#0C4A6E", "#0284C7"], ["#3F3F46", "#71717A"],
];

function gradientePorNombre(nombre) {
  if (!nombre) return GRADIENTES_INICIALES[0];
  const idx = nombre.charCodeAt(0) % GRADIENTES_INICIALES.length;
  return GRADIENTES_INICIALES[idx];
}

function LogoAseguradora({ nombre, dominio, size = 52 }) {
  const [fallo, setFallo] = useState(!dominio);
  const inicial = (nombre || "?")[0].toUpperCase();
  const [c1, c2] = gradientePorNombre(nombre);

  if (!fallo && dominio) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "14px",
        overflow: "hidden", flexShrink: 0,
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <img
          src={`https://logo.clearbit.com/${dominio}`}
          alt={nombre}
          onError={() => setFallo(true)}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "14px", flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 6px 16px ${c1}55`,
      fontWeight: 800, fontSize: size * 0.4,
      color: "#fff", letterSpacing: "-0.02em",
      fontFamily: "'Georgia', serif",
    }}>
      {inicial}
    </div>
  );
}

function PolizasModal({ entidad, tipo, onCerrar }) {
  const [polizas, setPolizas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const overlayRef = useRef(null);

  useEffect(() => {
    // Simulación mientras creamos el endpoint real de detalle
    const demo = [
      { id: 1, numero_poliza: "POL-2024-001", estado: "VIGENTE", descripcion: "Cumplimiento contrato obra civil sede norte", vigencia_hasta: "2025-12-31", monto_asegurado: "$ 850.000.000" },
      { id: 2, numero_poliza: "POL-2024-003", estado: "PAGADA", descripcion: "Anticipo mantenimiento instalaciones", vigencia_hasta: "2025-03-15", monto_asegurado: "$ 120.000.000" },
    ].filter((_, i) => i < (entidad.polizas_vinculadas || 2));

    setTimeout(() => { setPolizas(demo); setCargando(false); }, 400);
  }, [entidad.id]);

  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onCerrar]);

  const COLOR_ESTADO = {
    VIGENTE: { bg: "#D1FAE5", text: "#065F46" },
    PAGADA: { bg: "#FEF3C7", text: "#92400E" },
    BORRADOR: { bg: "#F1F5F9", text: "#475569" },
    EMITIDA: { bg: "#DBEAFE", text: "#1D4ED8" },
  };

  return (
    <div ref={overlayRef} onClick={(e) => e.target === overlayRef.current && onCerrar()} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(11,25,41,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "fadeIn 0.2s ease" }}>
      <div style={{ background: TOKENS.white, borderRadius: "20px", width: "100%", maxWidth: "680px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.06)", animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${TOKENS.border}`, display: "flex", alignItems: "flex-start", gap: "16px" }}>
          <LogoAseguradora nombre={entidad.nombre} dominio={entidad.dominio} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", color: TOKENS.slate, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "3px" }}>Pólizas vinculadas</div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: TOKENS.navy }}>{entidad.nombre}</h2>
          </div>
          <button onClick={onCerrar} style={{ width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${TOKENS.border}`, background: "none", cursor: "pointer", fontSize: "16px", color: TOKENS.slate, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 28px" }}>
          {cargando ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1, 2].map(i => <div key={i} style={{ height: "72px", borderRadius: "12px", background: "linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />)}
            </div>
          ) : polizas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: TOKENS.slateLight, fontSize: "15px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div> No hay pólizas vinculadas aún.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {polizas.map((p) => {
                const colores = COLOR_ESTADO[p.estado] || COLOR_ESTADO.BORRADOR;
                return (
                  <div key={p.id} style={{ padding: "16px", borderRadius: "12px", border: `1.5px solid ${TOKENS.border}`, display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "center", transition: "border-color 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = TOKENS.gold} onMouseLeave={e => e.currentTarget.style.borderColor = TOKENS.border}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: TOKENS.navy, fontFamily: "monospace" }}>{p.numero_poliza || "Sin número"}</span>
                        <span style={{ padding: "2px 8px", borderRadius: "99px", background: colores.bg, color: colores.text, fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em" }}>{p.estado}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: TOKENS.slate }}>{p.descripcion}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: TOKENS.navy }}>{p.monto_asegurado || "—"}</div>
                      <div style={{ fontSize: "11px", color: TOKENS.slateLight }}>Hasta {p.vigencia_hasta || "—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${TOKENS.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onCerrar} style={{ padding: "9px 20px", border: `1.5px solid ${TOKENS.border}`, borderRadius: "10px", background: TOKENS.white, color: TOKENS.slate, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function FormModal({ aseguradora, onGuardar, onCerrar }) {
  const esEdicion = !!aseguradora?.id;
  const [form, setForm] = useState({ nombre: aseguradora?.nombre || "", nit: aseguradora?.nit || "", dominio: aseguradora?.dominio || "", telefono: aseguradora?.telefono || "", email: aseguradora?.email || "", contacto: aseguradora?.contacto || "" });
  const [cargando, setCargando] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return;
    setCargando(true);
    await onGuardar({ ...form, id: aseguradora?.id });
    setCargando(false);
  };

  const inputStyle = { width: "100%", padding: "10px 12px", border: `1.5px solid ${TOKENS.border}`, borderRadius: "9px", fontSize: "13px", color: TOKENS.navy, background: TOKENS.white, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s" };

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(11,25,41,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: TOKENS.white, borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 32px 64px rgba(0,0,0,0.25)", animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px", background: TOKENS.navy, color: TOKENS.white }}>
          <div style={{ fontSize: "11px", opacity: 0.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>{esEdicion ? "Editar" : "Nueva"} aseguradora</div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>{esEdicion ? aseguradora.nombre : "Registrar Aseguradora"}</h2>
        </div>
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {[{ label: "Nombre *", key: "nombre", placeholder: "Ej: Seguros Sura S.A." }, { label: "NIT", key: "nit", placeholder: "Ej: 890.903.790-1" }, { label: "Dominio web (para logo)", key: "dominio", placeholder: "Ej: sura.com.co" }].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: TOKENS.slate, marginBottom: "6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>
              <input value={form[key]} onChange={set(key)} placeholder={placeholder} style={inputStyle} onFocus={e => e.target.style.borderColor = TOKENS.gold} onBlur={e => e.target.style.borderColor = TOKENS.border} />
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 28px 24px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onCerrar} style={{ padding: "9px 20px", border: `1.5px solid ${TOKENS.border}`, borderRadius: "10px", background: TOKENS.white, color: TOKENS.slate, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={cargando || !form.nombre.trim()} style={{ padding: "9px 24px", border: "none", borderRadius: "10px", background: cargando ? TOKENS.slate : TOKENS.navy, color: TOKENS.white, fontSize: "13px", fontWeight: 600, cursor: cargando ? "not-allowed" : "pointer" }}>{cargando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Registrar"}</button>
        </div>
      </div>
    </div>
  );
}

function AseguradoraCard({ aseguradora, onVerPolizas, onEditar, onEliminar }) {
  const [hovered, setHovered] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setConfirmEliminar(false); }} style={{ background: TOKENS.white, border: `1.5px solid ${hovered ? TOKENS.gold : TOKENS.border}`, borderRadius: "18px", overflow: "hidden", transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)", transform: hovered ? "translateY(-4px)" : "translateY(0)", boxShadow: hovered ? `0 20px 48px rgba(11,25,41,0.14), 0 0 0 1px ${TOKENS.gold}30` : "0 2px 8px rgba(0,0,0,0.05)", cursor: "default", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "5px", background: `linear-gradient(90deg, ${TOKENS.navy}, ${TOKENS.gold})`, opacity: hovered ? 1 : 0.4, transition: "opacity 0.3s" }} />
      <div style={{ padding: "20px 20px 16px", flex: 1 }}>
        <div style={{ display: "flex", gap: "14px", marginBottom: "16px" }}>
          <LogoAseguradora nombre={aseguradora.nombre} dominio={aseguradora.dominio} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: TOKENS.navy, lineHeight: 1.25, marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{aseguradora.nombre}</div>
            {aseguradora.nit && <div style={{ fontSize: "11px", color: TOKENS.slateLight, fontFamily: "monospace", letterSpacing: "0.04em" }}>NIT {aseguradora.nit}</div>}
          </div>
        </div>
        <div style={{ borderTop: `1.5px dashed ${TOKENS.border}`, margin: "0 0 14px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "16px" }}>
          {aseguradora.contacto && <InfoFila icono="👤" valor={aseguradora.contacto} />}
          {aseguradora.telefono && <InfoFila icono="📞" valor={aseguradora.telefono} href={`tel:${aseguradora.telefono}`} />}
          {aseguradora.email && <InfoFila icono="✉️" valor={aseguradora.email} href={`mailto:${aseguradora.email}`} />}
        </div>
        <div style={{ padding: "10px 14px", background: TOKENS.bg, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: TOKENS.navy, lineHeight: 1 }}>{aseguradora.polizas_vinculadas ?? 0}</div>
            <div style={{ fontSize: "10px", color: TOKENS.slateLight, marginTop: "1px", textTransform: "uppercase", letterSpacing: "0.05em" }}>pólizas vinculadas</div>
          </div>
          <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
            {[TOKENS.green, TOKENS.gold, TOKENS.slateLight].map((c, i) => <div key={i} style={{ width: "6px", height: [16, 10, 6][i] + "px", borderRadius: "3px", background: c, opacity: 0.7 }} />)}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${TOKENS.border}`, display: "flex", gap: "8px", background: hovered ? "#FAFBFC" : TOKENS.white, transition: "background 0.2s" }}>
        <button onClick={() => onVerPolizas(aseguradora)} style={{ flex: 1, padding: "8px 0", border: `1.5px solid ${TOKENS.navy}`, borderRadius: "9px", background: "none", color: TOKENS.navy, fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = TOKENS.navy; e.currentTarget.style.color = TOKENS.white; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = TOKENS.navy; }}>Ver pólizas</button>
        <button onClick={() => onEditar(aseguradora)} title="Editar" style={{ width: "34px", height: "34px", borderRadius: "9px", border: `1.5px solid ${TOKENS.border}`, background: "none", cursor: "pointer", fontSize: "14px", color: TOKENS.slate, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = TOKENS.gold} onMouseLeave={e => e.currentTarget.style.borderColor = TOKENS.border}>✏️</button>
        {!confirmEliminar ? <button onClick={() => setConfirmEliminar(true)} title="Eliminar" style={{ width: "34px", height: "34px", borderRadius: "9px", border: `1.5px solid ${TOKENS.border}`, background: "none", cursor: "pointer", fontSize: "14px", color: TOKENS.slate, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = TOKENS.red} onMouseLeave={e => e.currentTarget.style.borderColor = TOKENS.border}>🗑️</button> : <button onClick={() => onEliminar(aseguradora)} style={{ width: "34px", height: "34px", borderRadius: "9px", border: `1.5px solid ${TOKENS.red}`, background: TOKENS.redPale, cursor: "pointer", fontSize: "10px", fontWeight: 700, color: TOKENS.red, transition: "all 0.15s" }}>OK</button>}
      </div>
    </div>
  );
}

function InfoFila({ icono, valor, href }) {
  const content = (
    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
      <span style={{ fontSize: "12px", flexShrink: 0, opacity: 0.7 }}>{icono}</span>
      <span style={{ fontSize: "12px", color: href ? "#2563EB" : TOKENS.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{valor}</span>
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none" }}>{content}</a> : content;
}

// ── COMPONENTE PRINCIPAL (CON BACKEND) ────────────────────────────
export default function AseguradorasList({ onGuardar, onEliminar }) {
  const [aseguradoras, setAseguradoras] = useState([]);
  const [cargando, setCargando] = useState(true);

  // FETCH AL BACKEND REAL
  useEffect(() => {
    const fetchAseguradoras = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/aseguradoras");
        const data = await res.json();
        setAseguradoras(data);
      } catch (err) {
        console.error("Error cargando aseguradoras:", err);
      } finally {
        setCargando(false);
      }
    };
    fetchAseguradoras();
  }, []);

  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("polizas");
  const [modalPolizas, setModalPolizas] = useState(null);
  const [modalForm, setModalForm] = useState(null);

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let lista = q ? aseguradoras.filter(a => a.nombre.toLowerCase().includes(q) || (a.nit || "").includes(q)) : [...aseguradoras];
    if (orden === "polizas") lista.sort((a, b) => (b.polizas_vinculadas || 0) - (a.polizas_vinculadas || 0));
    if (orden === "nombre") lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return lista;
  }, [aseguradoras, busqueda, orden]);

  const handleGuardar = useCallback(async (data) => {
    await onGuardar?.(data);
    setModalForm(null);
  }, [onGuardar]);

  const handleEliminar = useCallback(async (a) => {
    if (window.confirm(`¿Eliminar ${a.nombre}? Esta acción no se puede deshacer.`)) await onEliminar?.(a.id);
  }, [onEliminar]);

  const totalPolizas = aseguradoras.reduce((s, a) => s + (a.polizas_vinculadas || 0), 0);

  if (cargando) return <div style={{ padding: "40px", textAlign: "center", color: TOKENS.slate }}>Cargando Aseguradoras...</div>;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 24px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}} @keyframes cardIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "28px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 5px", fontSize: "30px", fontWeight: 800, color: TOKENS.navy, letterSpacing: "-0.03em", lineHeight: 1.1 }}>Aseguradoras</h1>
          <p style={{ margin: 0, fontSize: "14px", color: TOKENS.slateLight }}>{aseguradoras.length} entidades · <strong style={{ color: TOKENS.navy }}>{totalPolizas}</strong> pólizas en total</p>
        </div>
        <button onClick={() => setModalForm({})} style={{ padding: "10px 20px", border: "none", borderRadius: "11px", background: TOKENS.navy, color: TOKENS.white, fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", boxShadow: "0 4px 16px rgba(11,25,41,0.2)", transition: "transform 0.15s, box-shadow 0.15s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}><span style={{ fontSize: "17px" }}>+</span> Nueva Aseguradora</button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", opacity: 0.5 }}>🔍</span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, NIT o contacto…" style={{ width: "100%", padding: "10px 14px 10px 38px", border: `1.5px solid ${TOKENS.border}`, borderRadius: "10px", fontSize: "13px", color: TOKENS.navy, background: TOKENS.white, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={orden} onChange={e => setOrden(e.target.value)} style={{ padding: "10px 34px 10px 12px", border: `1.5px solid ${TOKENS.border}`, borderRadius: "10px", fontSize: "13px", color: TOKENS.slate, background: TOKENS.white, cursor: "pointer", outline: "none", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
          <option value="polizas">Más pólizas primero</option>
          <option value="nombre">Nombre A → Z</option>
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", color: TOKENS.slateLight, fontSize: "16px", border: `2px dashed ${TOKENS.border}`, borderRadius: "16px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div> Sin resultados para "<strong>{busqueda}</strong>"
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "20px" }}>
          {filtradas.map((a, i) => (
            <div key={a.id} style={{ animation: `cardIn 0.3s ${i * 0.05}s ease backwards` }}>
              <AseguradoraCard aseguradora={a} onVerPolizas={() => setModalPolizas(a)} onEditar={() => setModalForm(a)} onEliminar={handleEliminar} />
            </div>
          ))}
        </div>
      )}

      {modalPolizas && <PolizasModal entidad={modalPolizas} tipo="aseguradoras" onCerrar={() => setModalPolizas(null)} />}
      {modalForm !== null && <FormModal aseguradora={Object.keys(modalForm).length ? modalForm : null} onGuardar={handleGuardar} onCerrar={() => setModalForm(null)} />}
    </div>
  );
}