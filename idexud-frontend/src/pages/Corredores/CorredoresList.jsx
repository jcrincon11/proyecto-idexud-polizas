// src/pages/Corredores/CorredoresList.jsx
// Vista de tarjetas para los corredores de seguros reales del IDEXUD.
// Consume GET /api/v1/corredores y POST /api/v1/corredores

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, Plus, Users, AlertTriangle, ArrowUpDown, X, Loader2 } from "lucide-react";
import { corredoresApi, polizasApi } from "../../services/api";
import CorredorCard, { CorredorSkeleton } from "../../components/corredores/CorredorCard";
import DashboardHeader from "../../components/layout/DashboardHeader";

// ── Estado vacío (sin resultados de búsqueda o sin corredores en BD) ─────────
function EstadoVacio({ busqueda }) {
  const esBusqueda = Boolean(busqueda);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "64px 24px", gap: 12,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "#F8FAFC", border: "1.5px solid #E2E8F0",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 4,
      }}>
        {esBusqueda
          ? <Search size={30} style={{ color: "#CBD5E1" }} />
          : <Users size={30} style={{ color: "#CBD5E1" }} />
        }
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#475569" }}>
        {esBusqueda ? "Sin resultados" : "No hay corredores registrados"}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: "#94A3B8", textAlign: "center", maxWidth: 320 }}>
        {esBusqueda
          ? <>No se encontraron corredores para <strong style={{ color: "#64748B" }}>"{busqueda}"</strong>. Prueba con otro término.</>
          : <>Ejecuta <code style={{ fontFamily: "monospace", background: "#F1F5F9", padding: "1px 6px", borderRadius: 5, fontSize: 12 }}>python -m scripts.seed_corredores</code> en el backend para cargar los 5 corredores reales.</>
        }
      </p>
    </div>
  );
}

// ── Baner de error de conexión ───────────────────────────────────────────────
function BannerError({ mensaje }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "14px 18px", background: "#FEF2F2",
      border: "1px solid #FECACA", borderRadius: 14,
      marginBottom: 24,
    }}>
      <AlertTriangle size={16} style={{ color: "#DC2626", marginTop: 1, flexShrink: 0 }} />
      <div>
        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#991B1B" }}>
          Error al cargar corredores
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#DC2626" }}>{mensaje}</p>
      </div>
    </div>
  );
}

// ── Modal de creación de corredor ────────────────────────────────────────────
function FormCorredor({ onCerrar, onCreado }) {
  const VACIO = { nombre_corredor: "", empresa: "", email_principal: "", telefono_principal: "", ayudante_nombre: "", email_ayudante: "", telefono_ayudante: "" };
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi] = useState(null);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const puedeGuardar = form.nombre_corredor.trim().length >= 2
    && form.empresa.trim().length >= 2
    && form.email_principal.trim().length > 0
    && form.telefono_principal.trim().length > 0;

  const handleGuardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setErrorApi(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v.trim() !== "")
      );
      await corredoresApi.crear(payload);
      onCreado();
      onCerrar();
    } catch (err) {
      setErrorApi(err.mensajeUsuario ?? "Error al registrar. Intente de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const inputSt = {
    width: "100%", padding: "9px 11px",
    border: "1.5px solid #E2E8F0", borderRadius: "9px",
    fontSize: "13px", color: "#0F172A", background: "#fff",
    outline: "none", boxSizing: "border-box",
  };
  const labelSt = { display: "block", fontSize: "11px", fontWeight: 600, color: "#64748B", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div
      onClick={onCerrar}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(11,25,41,0.7)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "18px", width: "100%", maxWidth: "520px", boxShadow: "0 32px 64px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", background: "#0F172A", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Nuevo registro</p>
            <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>Registrar Corredor</h2>
          </div>
          <button onClick={onCerrar} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", opacity: 0.6, padding: "4px" }}><X size={18} /></button>
        </div>
        {/* Campos */}
        <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelSt}>Empresa / Nombre comercial *</label>
            <input value={form.empresa} onChange={set("empresa")} placeholder="Ej: Seguros del Estado S.A." style={inputSt} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelSt}>Nombre del corredor *</label>
            <input value={form.nombre_corredor} onChange={set("nombre_corredor")} placeholder="Ej: Juan Pérez" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Email principal *</label>
            <input type="email" value={form.email_principal} onChange={set("email_principal")} placeholder="corredor@empresa.com" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Teléfono principal *</label>
            <input value={form.telefono_principal} onChange={set("telefono_principal")} placeholder="300 000 0000" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Nombre ayudante</label>
            <input value={form.ayudante_nombre} onChange={set("ayudante_nombre")} placeholder="Opcional" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Email ayudante</label>
            <input type="email" value={form.email_ayudante} onChange={set("email_ayudante")} placeholder="Opcional" style={inputSt} />
          </div>
        </div>
        {/* Error */}
        {errorApi && (
          <div style={{ margin: "0 24px 8px", padding: "10px 14px", borderRadius: "10px", background: "#FEF2F2", border: "1px solid #FECACA", fontSize: "12px", color: "#DC2626" }}>
            {errorApi}
          </div>
        )}
        {/* Footer */}
        <div style={{ padding: "12px 24px 20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onCerrar} style={{ padding: "9px 18px", border: "1.5px solid #E2E8F0", borderRadius: "9px", background: "#fff", color: "#64748B", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando || !puedeGuardar} style={{ padding: "9px 22px", border: "none", borderRadius: "9px", background: guardando || !puedeGuardar ? "#94A3B8" : "#0F172A", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: guardando || !puedeGuardar ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            {guardando && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            {guardando ? "Guardando…" : "Registrar corredor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de pólizas vinculadas al corredor ──────────────────────────────────
function PolizasModal({ corredor, onCerrar }) {
  const [polizas, setPolizas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    console.log("PolizasModal: cargando pólizas del corredor ID", corredor.id);
    polizasApi
      .listar({ corredor_id: corredor.id, por_pagina: 100 })
      .then(({ data }) => {
        if (!activo) return;
        console.log("PolizasModal: pólizas recibidas →", data.items?.length ?? 0);
        setPolizas(data.items ?? []);
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        console.error("PolizasModal: error al cargar pólizas", err);
        setError("No se pudieron cargar las pólizas.");
        setCargando(false);
      });
    return () => { activo = false; };
  }, [corredor.id]);

  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onCerrar]);

  const COL = {
    ACTIVA:             { bg: "#D1FAE5", text: "#065F46" },
    POR_VENCER:         { bg: "#FEF3C7", text: "#92400E" },
    VENCIDA:            { bg: "#FEE2E2", text: "#991B1B" },
    BORRADOR:           { bg: "#F1F5F9", text: "#475569" },
    PENDIENTE_REVISION: { bg: "#DBEAFE", text: "#1D4ED8" },
    RENOVADA:           { bg: "#EDE9FE", text: "#5B21B6" },
    ANULADA:            { bg: "#F1F5F9", text: "#6B7280" },
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onCerrar()}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "rgba(11,25,41,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640,
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        boxShadow: "0 40px 80px rgba(0,0,0,0.28)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "22px 28px 18px", borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: "#0F172A", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800,
          }}>
            {corredor.empresa.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Pólizas vinculadas {!cargando && `· ${polizas.length}`}
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
              {corredor.empresa}
            </h2>
          </div>
          <button
            onClick={onCerrar}
            style={{ width: 30, height: 30, border: "1px solid #E2E8F0", borderRadius: 7, background: "none", cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Lista con scroll vertical */}
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 28px" }}>
          {cargando ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 68, borderRadius: 12, background: "#F1F5F9" }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: 40, color: "#DC2626", fontSize: 14 }}>{error}</div>
          ) : polizas.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontSize: 15 }}>
              No hay pólizas vinculadas a este corredor.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {polizas.map(p => {
                const c = COL[p.estado] ?? COL.BORRADOR;
                return (
                  <div
                    key={p.id}
                    style={{ padding: "14px 16px", borderRadius: 11, border: "1.5px solid #E2E8F0", display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#0F172A"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>
                          {p.numero_poliza || "Sin número"}
                        </span>
                        <span style={{ padding: "2px 7px", borderRadius: 99, background: c.bg, color: c.text, fontSize: 10, fontWeight: 700 }}>
                          {p.estado}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>
                        {p.numero_contrato || p.objeto_contrato || "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                        {p.valor_asegurado_fmt || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>
                        Hasta {p.vigencia_hasta || "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 28px 20px", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button
            onClick={onCerrar}
            style={{ padding: "8px 18px", border: "1.5px solid #E2E8F0", borderRadius: 9, background: "#fff", color: "#64748B", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vista principal ──────────────────────────────────────────────────────────
export default function CorredoresList() {
  const [corredores, setCorredores] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalPol, setModalPol]     = useState(null);
  const [busqueda, setBusqueda]     = useState("");
  const [ordenar, setOrdenar]       = useState("activas");

  const fetchCorredores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await corredoresApi.listar();
      setCorredores(data);
    } catch (err) {
      setError(err.mensajeUsuario ?? "Error al cargar corredores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCorredores(); }, [fetchCorredores]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = corredores.filter((c) =>
      c.empresa.toLowerCase().includes(q) ||
      c.nombre_corredor.toLowerCase().includes(q) ||
      (c.ayudante_nombre ?? "").toLowerCase().includes(q) ||
      c.email_principal.toLowerCase().includes(q)
    );
    return [...filtrados].sort((a, b) => {
      if (ordenar === "activas") return (b.polizas_activas || 0) - (a.polizas_activas || 0);
      return a.empresa.localeCompare(b.empresa, "es");
    });
  }, [corredores, busqueda, ordenar]);

  const totalActivas = corredores.reduce((s, c) => s + (c.polizas_activas || 0), 0);

  return (
    <div style={{
      maxWidth: 1120, margin: "0 auto", padding: "28px 24px",
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}>

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <DashboardHeader
        title="Corredores de Seguros"
        subtitle="Intermediarios de seguros que gestionan las pólizas contractuales del IDEXUD."
        breadcrumb="IDEXUD · Corredores"
        accent="#8B5CF6"
        accent2="#6366F1"
        stats={[
          { label: 'CORREDORES',    value: loading ? null : corredores.length, desc: 'Intermediarios registrados' },
          { label: 'PÓLIZAS ACTIVAS', value: loading ? null : totalActivas,    desc: 'Pólizas gestionadas'        },
        ]}
      >
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold border border-white/25 text-white bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Plus size={16} />
          Nuevo corredor
        </button>
      </DashboardHeader>

      {/* ── Banner de error ─────────────────────────────────────────────────── */}
      {error && !loading && <BannerError mensaje={error} />}

      {/* ── Barra de filtros ────────────────────────────────────────────────── */}
      {!error && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {/* Buscador */}
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search
              size={14}
              style={{
                position: "absolute", left: 13, top: "50%",
                transform: "translateY(-50%)", color: "#94A3B8",
                pointerEvents: "none",
              }}
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por empresa, corredor o email…"
              style={{
                width: "100%", padding: "10px 14px 10px 36px",
                border: "1.5px solid #E2E8F0", borderRadius: 10,
                fontSize: 13, color: "#0F172A", background: "#fff",
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#94A3B8"; }}
              onBlur={(e)  => { e.target.style.borderColor = "#E2E8F0"; }}
            />
          </div>

          {/* Ordenar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <ArrowUpDown
              size={13}
              style={{
                position: "absolute", left: 11, top: "50%",
                transform: "translateY(-50%)", color: "#94A3B8",
                pointerEvents: "none",
              }}
            />
            <select
              value={ordenar}
              onChange={(e) => setOrdenar(e.target.value)}
              style={{
                padding: "10px 36px 10px 30px",
                border: "1.5px solid #E2E8F0", borderRadius: 10,
                fontSize: 13, color: "#475569", background: "#fff",
                cursor: "pointer", outline: "none", appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value="activas">Más pólizas activas</option>
              <option value="nombre">Empresa A → Z</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 20,
        }}>
          {[1, 2, 3, 4, 5].map((n) => <CorredorSkeleton key={n} />)}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVacio busqueda={busqueda} />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 20,
        }}>
          {lista.map((corredor) => (
            <CorredorCard
              key={corredor.id}
              corredor={corredor}
              onVerPolizas={(c) => {
                console.log("Ver pólizas clickeado, ID Corredor:", c.id);
                setModalPol(c);
              }}
            />
          ))}
        </div>
      )}

      {modalCrear && (
        <FormCorredor
          onCerrar={() => setModalCrear(false)}
          onCreado={fetchCorredores}
        />
      )}

      {modalPol && (
        <PolizasModal
          corredor={modalPol}
          onCerrar={() => setModalPol(null)}
        />
      )}
    </div>
  );
}
