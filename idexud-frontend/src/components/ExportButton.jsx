import React, { useState } from "react";

// ════════════════════════════════════════════════════════════════════
// COMPONENTE: ExportButton (Arreglado con export default)
// ════════════════════════════════════════════════════════════════════

export default function ExportButton({ endpoint = "http://localhost:8000/api/v1/reportes/excel" }) {
  const [estado, setEstado] = useState("idle"); // idle | cargando | exito | error

  const descargar = async () => {
    setEstado("cargando");

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {},
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const nombreArchivo = match?.[1] || `cartera_polizas_${_hoy()}.xlsx`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);

      setEstado("exito");
      setTimeout(() => setEstado("idle"), 3000);

    } catch (err) {
      console.error("[ExportButton] Error al descargar:", err);
      setEstado("error");
      setTimeout(() => setEstado("idle"), 4000);
    }
  };

  const config = {
    idle: {
      label: "Exportar Excel",
      icono: "⬇️",
      bg: "#16A34A",
      bgHov: "#15803D",
      shadow: "rgba(22,163,74,0.35)",
      cursor: "pointer",
    },
    cargando: {
      label: "Generando...",
      icono: null,
      bg: "#6B7280",
      bgHov: "#6B7280",
      shadow: "rgba(107,114,128,0.2)",
      cursor: "not-allowed",
    },
    exito: {
      label: "¡Descargado!",
      icono: "✓",
      bg: "#059669",
      bgHov: "#059669",
      shadow: "rgba(5,150,105,0.35)",
      cursor: "default",
    },
    error: {
      label: "Error al generar",
      icono: "⚠",
      bg: "#DC2626",
      bgHov: "#DC2626",
      shadow: "rgba(220,38,38,0.3)",
      cursor: "default",
    },
  }[estado];

  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={estado === "idle" ? descargar : undefined}
      disabled={estado === "cargando"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Descargar cartera de pólizas en formato Excel protegido"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "9px 18px",
        border: "none",
        borderRadius: "10px",
        background: hovered && estado === "idle" ? config.bgHov : config.bg,
        color: "#fff",
        fontSize: "13px",
        fontWeight: 600,
        cursor: config.cursor,
        transition: "all 0.18s ease",
        boxShadow: `0 4px 12px ${config.shadow}`,
        transform: hovered && estado === "idle" ? "translateY(-1px)" : "translateY(0)",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {estado === "cargando" ? (
        <span style={{
          width: "14px",
          height: "14px",
          border: "2px solid rgba(255,255,255,0.35)",
          borderTopColor: "#fff",
          borderRadius: "50%",
          display: "inline-block",
          animation: "excelSpinner 0.75s linear infinite",
          flexShrink: 0,
        }} />
      ) : (
        <span style={{ fontSize: "16px", lineHeight: 1, flexShrink: 0 }}>
          {config.icono}
        </span>
      )}

      {config.label}

      {estado === "idle" && (
        <span style={{
          fontSize: "9px",
          fontWeight: 700,
          padding: "2px 5px",
          borderRadius: "4px",
          background: "rgba(255,255,255,0.22)",
          letterSpacing: "0.08em",
        }}>
          XLSX
        </span>
      )}

      <style>{`
        @keyframes excelSpinner {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}

function _hoy() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "");
}