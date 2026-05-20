// src/components/polizas/SolicitudModal.jsx
// Modal de PMO con animación de ticket de éxito.
// Aplica createPortal si tu proyecto ya lo tiene configurado.

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";

const TIPOS_GARANTIA = [
  { value: "POLIZA_CUMPLIMIENTO", label: "Póliza de Cumplimiento" },
  { value: "POLIZA_ANTICIPO",     label: "Póliza de Anticipo" },
  { value: "POLIZA_CALIDAD",      label: "Póliza de Calidad" },
  { value: "GARANTIA_BANCARIA",   label: "Garantía Bancaria" },
  { value: "PAGARE",              label: "Pagaré" },
];

const LABEL_TIPO = Object.fromEntries(TIPOS_GARANTIA.map((t) => [t.value, t.label]));

// ── Estilos constantes ────────────────────────────────────────────
const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(6px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  modal: {
    background: "#fff",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "560px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 32px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
    animation: "modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)",
  },
  header:  { padding: "28px 28px 0", flexShrink: 0 },
  body:    { padding: "24px 28px", overflowY: "auto", flex: 1 },
  footer:  {
    padding: "20px 28px",
    borderTop: "1px solid #F1F5F9",
    display: "flex", gap: "10px", justifyContent: "flex-end",
    flexShrink: 0,
  },
  label: {
    display: "block", fontSize: "12px", fontWeight: 600,
    color: "#475569", marginBottom: "6px",
    letterSpacing: "0.03em", textTransform: "uppercase",
  },
  input: {
    width: "100%", padding: "11px 14px",
    border: "1.5px solid #E2E8F0", borderRadius: "10px",
    fontSize: "14px", color: "#0F172A", background: "#fff",
    outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
  },
  inputFocus: {
    borderColor: "#2563EB",
    boxShadow: "0 0 0 3px rgba(37,99,235,0.12)",
  },
  fieldGroup: { marginBottom: "20px" },
  btnSecondary: {
    padding: "10px 20px", border: "1.5px solid #E2E8F0", borderRadius: "10px",
    background: "#fff", color: "#475569", fontSize: "14px",
    fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
  },
  btnPrimary: {
    padding: "10px 24px", border: "none", borderRadius: "10px",
    background: "#2563EB", color: "#fff", fontSize: "14px",
    fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  },
};

// ── Inputs con estado focus ──────────────────────────────────────
function StyledInput({ style, forwardRef, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      ref={forwardRef}
      {...props}
      style={{ ...s.input, ...(focused ? s.inputFocus : {}), ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function StyledTextarea({ style, forwardRef, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      ref={forwardRef}
      {...props}
      style={{
        ...s.input, minHeight: "90px", resize: "vertical",
        fontFamily: "inherit", lineHeight: 1.6,
        ...(focused ? s.inputFocus : {}), ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function StyledSelect({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...s.input, appearance: "none", paddingRight: "36px", cursor: "pointer",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
        ...(focused ? s.inputFocus : {}), ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div style={s.fieldGroup}>
      <label style={s.label}>
        {label}
        {required && <span style={{ color: "#EF4444", marginLeft: "3px" }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#94A3B8" }}>{hint}</p>
      )}
      {error && (
        <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#EF4444", fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TICKET DE ÉXITO — la animación WOW
// ════════════════════════════════════════════════════════════════════

function TicketExito({ solicitud, onCerrar }) {
  // solicitud = { id, numero_radicado, descripcion, tipo_garantia, created_at }
  const [fase, setFase] = useState("entrando"); // entrando → visible → saliendo

  useEffect(() => {
    // Fase 1: tick de entrada
    const t1 = setTimeout(() => setFase("visible"), 50);
    return () => clearTimeout(t1);
  }, []);

  const fecha = solicitud.created_at
    ? new Date(solicitud.created_at).toLocaleString("es-CO", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : new Date().toLocaleString("es-CO", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

  const radicado = solicitud.numero_radicado
    || `SOL-${new Date().getFullYear()}-${String(solicitud.id).padStart(5, "0")}`;

  return (
    <div style={{
      padding: "32px 28px 28px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      transition: "opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      opacity:   fase === "visible" ? 1 : 0,
      transform: fase === "visible" ? "scale(1) translateY(0)" : "scale(0.9) translateY(16px)",
    }}>

      {/* Ícono de check animado */}
      <div style={{
        width: "72px", height: "72px", borderRadius: "50%",
        background: "linear-gradient(135deg, #10B981, #059669)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: "20px",
        boxShadow: "0 0 0 12px rgba(16,185,129,0.12), 0 8px 24px rgba(16,185,129,0.35)",
        animation: fase === "visible" ? "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}>
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none"
             style={{ animation: fase === "visible" ? "drawCheck 0.4s 0.2s ease forwards" : "none",
                      strokeDasharray: 50, strokeDashoffset: fase === "visible" ? 0 : 50 }}>
          <path d="M7 17L14 24L27 10" stroke="white" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ fontSize: "11px", fontWeight: 700, color: "#10B981",
                    letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>
        Solicitud Creada
      </div>
      <h2 style={{ margin: "0 0 28px", fontSize: "22px", fontWeight: 800,
                   color: "#0F172A", textAlign: "center" }}>
        ¡Todo listo para revisión!
      </h2>

      {/* El ticket / recibo */}
      <div style={{
        width: "100%",
        background: "#F8FAFC",
        borderRadius: "16px",
        border: "1.5px solid #E2E8F0",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Header del ticket */}
        <div style={{
          background: "linear-gradient(135deg, #0F172A, #1E293B)",
          padding: "20px 24px",
          color: "#fff",
        }}>
          <div style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 600,
                        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
            N° de Radicado
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "0.04em",
                        fontFamily: "monospace", color: "#fff" }}>
            {radicado}
          </div>
        </div>

        {/* Separador de ticket con muescas */}
        <div style={{
          position: "relative", height: "20px",
          background: "#F8FAFC",
          display: "flex", alignItems: "center",
        }}>
          <div style={{
            position: "absolute", left: "-12px",
            width: "24px", height: "24px", borderRadius: "50%",
            background: "#fff", border: "1.5px solid #E2E8F0",
          }} />
          <div style={{
            flex: 1, borderTop: "2px dashed #E2E8F0", margin: "0 20px",
          }} />
          <div style={{
            position: "absolute", right: "-12px",
            width: "24px", height: "24px", borderRadius: "50%",
            background: "#fff", border: "1.5px solid #E2E8F0",
          }} />
        </div>

        {/* Cuerpo del ticket */}
        <div style={{ padding: "16px 24px 24px" }}>
          <TicketFila label="Descripción" valor={
            solicitud.descripcion?.length > 60
              ? solicitud.descripcion.substring(0, 60) + "..."
              : solicitud.descripcion
          } />
          <TicketFila label="Tipo de garantía"
            valor={LABEL_TIPO[solicitud.tipo_garantia] || solicitud.tipo_garantia} />
          <TicketFila label="Estado" valor={
            <span style={{
              padding: "2px 10px", borderRadius: "99px",
              background: "#DBEAFE", color: "#1D4ED8",
              fontSize: "12px", fontWeight: 700,
            }}>
              BORRADOR
            </span>
          } />
          <TicketFila label="Fecha de creación" valor={fecha} ultimo />
        </div>

        {/* Código QR decorativo (SVG estático, solo estético) */}
        <div style={{
          position: "absolute", bottom: "16px", right: "20px",
          opacity: 0.15,
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <rect x="2"  y="2"  width="16" height="16" rx="2" fill="none" stroke="#0F172A" strokeWidth="2"/>
            <rect x="6"  y="6"  width="8"  height="8"  fill="#0F172A"/>
            <rect x="22" y="2"  width="16" height="16" rx="2" fill="none" stroke="#0F172A" strokeWidth="2"/>
            <rect x="26" y="6"  width="8"  height="8"  fill="#0F172A"/>
            <rect x="2"  y="22" width="16" height="16" rx="2" fill="none" stroke="#0F172A" strokeWidth="2"/>
            <rect x="6"  y="26" width="8"  height="8"  fill="#0F172A"/>
            <rect x="22" y="22" width="4"  height="4"  fill="#0F172A"/>
            <rect x="28" y="22" width="4"  height="4"  fill="#0F172A"/>
            <rect x="34" y="22" width="4"  height="4"  fill="#0F172A"/>
            <rect x="22" y="28" width="4"  height="4"  fill="#0F172A"/>
            <rect x="28" y="34" width="4"  height="4"  fill="#0F172A"/>
            <rect x="34" y="28" width="4"  height="4"  fill="#0F172A"/>
          </svg>
        </div>
      </div>

      {/* Aviso del siguiente paso */}
      <div style={{
        marginTop: "20px", padding: "12px 16px",
        borderRadius: "10px", background: "#DBEAFE",
        border: "1px solid #93C5FD",
        display: "flex", alignItems: "center", gap: "10px",
        width: "100%", boxSizing: "border-box",
      }}>
        <span style={{ fontSize: "18px", flexShrink: 0 }}>📋</span>
        <span style={{ fontSize: "13px", color: "#1E40AF", lineHeight: 1.5 }}>
          La solicitud está en cola para revisión PMO. Recibirás una
          notificación cuando avance al siguiente estado.
        </span>
      </div>

      {/* Botón cerrar */}
      <button
        onClick={onCerrar}
        style={{
          marginTop: "24px", width: "100%",
          padding: "13px", border: "none", borderRadius: "12px",
          background: "linear-gradient(135deg, #10B981, #059669)",
          color: "#fff", fontSize: "15px", fontWeight: 700,
          cursor: "pointer", letterSpacing: "0.02em",
          boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(16,185,129,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(16,185,129,0.35)";
        }}
      >
        Entendido ✓
      </button>
    </div>
  );
}

function TicketFila({ label, valor, ultimo }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", gap: "16px",
      padding: "10px 0",
      borderBottom: ultimo ? "none" : "1px solid #E2E8F0",
    }}>
      <span style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600,
                     textTransform: "uppercase", letterSpacing: "0.04em",
                     flexShrink: 0, paddingTop: "1px" }}>
        {label}
      </span>
      <span style={{ fontSize: "13px", color: "#0F172A", fontWeight: 500,
                     textAlign: "right", lineHeight: 1.5 }}>
        {valor}
      </span>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// MODAL PRINCIPAL
// ════════════════════════════════════════════════════════════════════

export default function SolicitudModal({ open, onClose, onSubmit }) {
  const { usuario } = useAuth();
  const esPMO   = usuario.rol === "PMO" || usuario.rol === "SOLICITANTE";
  const esAdmin = usuario.rol === "ADMIN";

  // "formulario" | "cargando" | "exito"
  const [vista, setVista] = useState("formulario");
  const [solicitudCreada, setSolicitudCreada] = useState(null);

  const [form, setForm] = useState({
    descripcion: "", tipo_garantia: "", enlace_nextcloud: "", monto_asegurado: "",
  });
  const [errors, setErrors] = useState({});
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setVista("formulario");
      setSolicitudCreada(null);
      setForm({ descripcion: "", tipo_garantia: "", enlace_nextcloud: "", monto_asegurado: "" });
      setErrors({});
      setTimeout(() => firstInputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape" && vista !== "cargando") onClose(); };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, vista]);

  const set = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errors[campo]) setErrors((er) => ({ ...er, [campo]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.descripcion || form.descripcion.trim().length < 10)
      e.descripcion = "Mínimo 10 caracteres.";
    if (!form.tipo_garantia)
      e.tipo_garantia = "Selecciona el tipo de garantía.";
    if (!form.enlace_nextcloud || form.enlace_nextcloud.trim().length < 5)
      e.enlace_nextcloud = "Ingresa la ruta o URL en NextCloud.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erroresNuevos = validar();
    if (Object.keys(erroresNuevos).length) {
      setErrors(erroresNuevos);
      return;
    }

    setVista("cargando");

    try {
      const resultado = await onSubmit({
        descripcion:      form.descripcion.trim(),
        tipo_garantia:    form.tipo_garantia,
        enlace_nextcloud: form.enlace_nextcloud.trim(),
        monto_asegurado:  form.monto_asegurado ? parseFloat(form.monto_asegurado) : null,
      });

      // onSubmit debe retornar el objeto creado por el backend
      // { id, numero_radicado, descripcion, tipo_garantia, created_at }
      setSolicitudCreada(resultado || {
        id:              "—",
        numero_radicado: "SOL-DEMO",
        descripcion:     form.descripcion.trim(),
        tipo_garantia:   form.tipo_garantia,
        created_at:      new Date().toISOString(),
      });
      setVista("exito");

    } catch (err) {
      setVista("formulario");
      setErrors({ general: err.message || "Error al crear la solicitud." });
    }
  };

  const handleCerrar = () => {
    onClose();
    // Resetear con pequeño delay para que la animación de salida se vea
    setTimeout(() => {
      setVista("formulario");
      setSolicitudCreada(null);
    }, 300);
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes popIn {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={s.overlay} onClick={vista !== "cargando" ? onClose : undefined}>
        <div style={{
          ...s.modal,
          // El ticket no necesita maxHeight rígido
          maxHeight: vista === "exito" ? "none" : "90vh",
        }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

          {/* ── Vista: ÉXITO (ticket) ── */}
          {vista === "exito" && solicitudCreada && (
            <TicketExito solicitud={solicitudCreada} onCerrar={handleCerrar} />
          )}

          {/* ── Vista: CARGANDO ── */}
          {vista === "cargando" && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "60px 32px", gap: "20px",
            }}>
              <div style={{
                width: "48px", height: "48px",
                border: "3px solid #E2E8F0",
                borderTopColor: "#2563EB",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ margin: 0, color: "#64748B", fontSize: "15px" }}>
                Creando solicitud...
              </p>
            </div>
          )}

          {/* ── Vista: FORMULARIO ── */}
          {vista === "formulario" && (
            <>
              {/* Cabecera */}
              <div style={s.header}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "4px 10px", borderRadius: "99px",
                  background: `${usuario.color}15`, marginBottom: "16px",
                }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: usuario.color, color: "#fff",
                    fontSize: "9px", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {usuario.iniciales}
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: usuario.color }}>
                    {usuario.nombre} · {usuario.rol}
                  </span>
                </div>

                <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 700, color: "#0F172A" }}>
                  Nueva Solicitud
                </h2>
                <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#64748B" }}>
                  {esPMO && !esAdmin
                    ? "Completa la información básica. El equipo jurídico gestionará los datos de expedición."
                    : "Completa la información de la solicitud de garantía."}
                </p>

                {/* Progreso */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "28px" }}>
                  {["Tu solicitud", "Revisión PMO", "Jurídica", "Emisión"].map((paso, i) => (
                    <div key={paso} style={{ flex: 1 }}>
                      <div style={{
                        height: "4px", borderRadius: "99px",
                        background: i === 0 ? "#2563EB" : "#E2E8F0", marginBottom: "6px",
                      }} />
                      <div style={{ fontSize: "10px", color: i === 0 ? "#2563EB" : "#94A3B8",
                                    fontWeight: i === 0 ? 600 : 400 }}>
                        {paso}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit}>
                <div style={s.body}>
                  {errors.general && (
                    <div style={{
                      padding: "12px 14px", borderRadius: "10px",
                      background: "#FEF2F2", border: "1px solid #FECACA",
                      color: "#991B1B", fontSize: "13px", marginBottom: "20px",
                    }}>
                      {errors.general}
                    </div>
                  )}

                  <Field label="Descripción de la garantía" required
                    hint="Describe el objeto del contrato que requiere la garantía."
                    error={errors.descripcion}>
                    <StyledTextarea
                      forwardRef={firstInputRef}
                      value={form.descripcion}
                      onChange={set("descripcion")}
                      placeholder="Ej: Garantía de cumplimiento para el contrato de construcción..."
                      maxLength={2000}
                    />
                    <div style={{ textAlign: "right", fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                      {form.descripcion.length}/2000
                    </div>
                  </Field>

                  <Field label="Tipo de garantía" required error={errors.tipo_garantia}>
                    <StyledSelect value={form.tipo_garantia} onChange={set("tipo_garantia")}>
                      <option value="">Seleccionar tipo...</option>
                      {TIPOS_GARANTIA.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </StyledSelect>
                  </Field>

                  <Field label="Carpeta en NextCloud" required
                    hint="URL o ruta donde están los documentos del proyecto."
                    error={errors.enlace_nextcloud}>
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute", left: "12px", top: "50%",
                        transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none",
                      }}>🗂</span>
                      <StyledInput
                        type="text"
                        value={form.enlace_nextcloud}
                        onChange={set("enlace_nextcloud")}
                        placeholder="https://nextcloud.empresa.com/s/..."
                        style={{ paddingLeft: "38px" }}
                      />
                    </div>
                  </Field>

                  <Field label="Monto asegurado (opcional)" hint="En pesos colombianos (COP).">
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute", left: "14px", top: "50%",
                        transform: "translateY(-50%)", fontSize: "13px",
                        color: "#94A3B8", fontWeight: 600, pointerEvents: "none",
                      }}>$</span>
                      <StyledInput
                        type="number"
                        value={form.monto_asegurado}
                        onChange={set("monto_asegurado")}
                        placeholder="0"
                        min="0"
                        step="1000"
                        style={{ paddingLeft: "28px" }}
                      />
                    </div>
                  </Field>

                  {!esPMO || esAdmin ? (
                    <Field label="Centro de costos" hint="Se requiere antes del análisis jurídico.">
                      <StyledInput
                        type="text"
                        value={form.centro_de_costos || ""}
                        onChange={set("centro_de_costos")}
                        placeholder="Ej: CC-2024-INFRA-001"
                        maxLength={100}
                      />
                    </Field>
                  ) : (
                    <div style={{
                      padding: "14px 16px", borderRadius: "10px",
                      background: "#F8FAFC", border: "1.5px dashed #CBD5E1",
                      display: "flex", alignItems: "flex-start", gap: "10px",
                    }}>
                      <span style={{ fontSize: "18px", flexShrink: 0 }}>🔒</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                          Centro de Costos
                        </div>
                        <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                          Se habilitará cuando la solicitud pase a análisis jurídico.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={s.footer}>
                  <button type="button" style={s.btnSecondary} onClick={onClose}>
                    Cancelar
                  </button>
                  <button type="submit" style={{ ...s.btnPrimary }}>
                    Crear Solicitud →
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
