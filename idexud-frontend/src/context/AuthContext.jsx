// src/context/AuthContext.jsx
// Contexto de simulación de roles para demo.
// En producción, reemplazar MOCK_USERS y useAuth con el proveedor real de autenticación.

import React, { createContext, useContext, useState, useCallback } from "react";

// ── Usuarios de demo ──────────────────────────────────────────────
const MOCK_USERS = [
  {
    id: 1,
    nombre: "Jeffer Ramírez",
    iniciales: "JR",
    email: "jeffer.ramirez@empresa.com",
    rol: "PMO",
    color: "#2563EB",          // azul
    descripcion: "Gestión de Proyectos",
  },
  {
    id: 2,
    nombre: "Camila Torres",
    iniciales: "CT",
    email: "camila.torres@empresa.com",
    rol: "JURIDICA",
    color: "#7C3AED",          // violeta
    descripcion: "Área Jurídica",
  },
  {
    id: 3,
    nombre: "Andrés Molina",
    iniciales: "AM",
    email: "andres.molina@empresa.com",
    rol: "FINANCIERA",
    color: "#059669",          // verde
    descripcion: "Área Financiera",
  },
  {
    id: 4,
    nombre: "Admin Sistema",
    iniciales: "AS",
    email: "admin@empresa.com",
    rol: "ADMIN",
    color: "#DC2626",          // rojo
    descripcion: "Administrador",
  },
];

// ── Permisos por rol (espejo del backend PERMISOS_POR_ESTADO) ─────
// El frontend los usa para mostrar/ocultar campos y botones.
export const CAMPOS_EDITABLES_POR_ESTADO = {
  BORRADOR: {
    PMO:        ["descripcion", "tipo_garantia", "enlace_nextcloud", "monto_asegurado"],
    JURIDICA:   [],
    FINANCIERA: [],
    ADMIN:      ["*"],
  },
  SOLICITUD_PMO: {
    PMO:        ["observaciones_pmo"],
    JURIDICA:   [],
    FINANCIERA: [],
    ADMIN:      ["*"],
  },
  JURIDICA_ANALISIS: {
    PMO:        ["centro_de_costos"],
    JURIDICA:   ["centro_de_costos", "aseguradora", "numero_poliza_borrador",
                 "fecha_inicio_vigencia", "fecha_fin_vigencia", "condiciones_especiales"],
    FINANCIERA: [],
    ADMIN:      ["*"],
  },
  EMITIDA: {
    PMO:        [],
    JURIDICA:   ["numero_poliza", "fecha_emision", "enlace_documento_poliza"],
    FINANCIERA: ["valor_prima", "fecha_pago_programado"],
    ADMIN:      ["*"],
  },
  PAGADA: {
    PMO:        [],
    JURIDICA:   [],
    FINANCIERA: ["valor_prima_pagada", "fecha_pago_real", "comprobante_pago", "valor_reintegro"],
    ADMIN:      ["*"],
  },
  REINTEGRADA: {
    PMO:        [],
    JURIDICA:   [],
    FINANCIERA: ["observaciones_reintegro"],
    ADMIN:      ["*"],
  },
  NO_REQUIERE_REINTEGRO: {
    PMO:        [],
    JURIDICA:   [],
    FINANCIERA: ["observaciones_reintegro"],
    ADMIN:      ["*"],
  },
};

// ── Helpers exportados ────────────────────────────────────────────
export const puedeEditarCampo = (campo, estado, rol) => {
  const permisos = CAMPOS_EDITABLES_POR_ESTADO[estado]?.[rol] ?? [];
  return permisos.includes("*") || permisos.includes(campo);
};

export const puedeEditarAlgo = (estado, rol) => {
  const permisos = CAMPOS_EDITABLES_POR_ESTADO[estado]?.[rol] ?? [];
  return permisos.length > 0;
};

export const LABEL_ESTADO = {
  BORRADOR:               "Borrador",
  SOLICITUD_PMO:          "Revisión PMO",
  JURIDICA_ANALISIS:      "Análisis Jurídico",
  EMITIDA:                "Emitida",
  PAGADA:                 "Pagada",
  REINTEGRADA:            "Reintegrada",
  NO_REQUIERE_REINTEGRO:  "Sin Reintegro",
};

export const COLOR_ESTADO = {
  BORRADOR:               { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" },
  SOLICITUD_PMO:          { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" },
  JURIDICA_ANALISIS:      { bg: "#EDE9FE", text: "#6D28D9", border: "#C4B5FD" },
  EMITIDA:                { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  PAGADA:                 { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  REINTEGRADA:            { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  NO_REQUIERE_REINTEGRO:  { bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
};

// ── Contexto ──────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(MOCK_USERS[0]); // Jeffer (PMO) por defecto
  const [selectorVisible, setSelectorVisible] = useState(false);

  const cambiarUsuario = useCallback((nuevoUsuario) => {
    setUsuario(nuevoUsuario);
    setSelectorVisible(false);
  }, []);

  const puedeEditar = useCallback(
    (campo, estado) => puedeEditarCampo(campo, estado, usuario.rol),
    [usuario.rol]
  );

  return (
    <AuthContext.Provider
      value={{
        usuario,
        usuarios: MOCK_USERS,
        cambiarUsuario,
        selectorVisible,
        setSelectorVisible,
        puedeEditar,
        puedeEditarAlgo: (estado) => puedeEditarAlgo(estado, usuario.rol),
        esAdmin: usuario.rol === "ADMIN",
      }}
    >
      {children}

      {/* Selector de rol flotante — solo para demo */}
      {selectorVisible && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSelectorVisible(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "32px",
              width: "400px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "8px", fontSize: "11px", fontWeight: 600,
                          letterSpacing: "0.1em", color: "#94A3B8", textTransform: "uppercase" }}>
              Demo — Simular rol
            </div>
            <h2 style={{ margin: "0 0 24px", fontSize: "22px", fontWeight: 700, color: "#0F172A" }}>
              ¿Quién eres hoy?
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {MOCK_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => cambiarUsuario(u)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    border: usuario.id === u.id
                      ? `2px solid ${u.color}`
                      : "2px solid #E2E8F0",
                    borderRadius: "12px",
                    background: usuario.id === u.id ? `${u.color}10` : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: u.color, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: 700, flexShrink: 0,
                  }}>
                    {u.iniciales}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "15px" }}>
                      {u.nombre}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      {u.descripcion} · {u.rol}
                    </div>
                  </div>
                  {usuario.id === u.id && (
                    <div style={{ marginLeft: "auto", color: u.color, fontSize: "18px" }}>✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

// ── Componente: Badge de usuario actual (para navbar) ─────────────
export function UserRolBadge() {
  const { usuario, setSelectorVisible } = useAuth();

  return (
    <button
      onClick={() => setSelectorVisible(true)}
      title="Cambiar rol (demo)"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 12px 6px 6px",
        background: "#F8FAFC",
        border: "1.5px solid #E2E8F0",
        borderRadius: "99px",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{
        width: "30px", height: "30px", borderRadius: "50%",
        background: usuario.color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", fontWeight: 700,
      }}>
        {usuario.iniciales}
      </div>
      <div style={{ textAlign: "left", lineHeight: 1.3 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>
          {usuario.nombre.split(" ")[0]}
        </div>
        <div style={{ fontSize: "11px", color: "#64748B" }}>{usuario.rol}</div>
      </div>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "#94A3B8" }}>
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
