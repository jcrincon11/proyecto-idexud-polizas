/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {

      // ───────────────────────────────────────────────────────────────────────
      // COLORES INSTITUCIONALES — Universidad Distrital / Idexud
      // Uso: bg-ud-naranja, text-ud-gris, border-ud-amarillo, etc.
      // ───────────────────────────────────────────────────────────────────────
      colors: {
        // Paleta primaria
        "ud-naranja":      "#CC6628",   // Color corporativo principal UD
        "ud-naranja-dark": "#A8501A",   // Hover / pressed
        "ud-naranja-light":"#E8884A",   // Tints suaves
        "ud-naranja-50":   "#FDF3EC",   // Fondos muy suaves

        "ud-amarillo":     "#FE9D12",   // Acento vibrante
        "ud-amarillo-dark":"#D8820A",   // Hover amarillo
        "ud-amarillo-50":  "#FFF8EC",   // Fondos amarillo muy suave

        // Grises institucionales
        "ud-gris":         "#595959",   // Texto principal
        "ud-gris-claro":   "#A6A6A6",   // Texto secundario / bordes
        "ud-gris-50":      "#F7F7F7",   // Fondos de página
        "ud-gris-100":     "#EFEFEF",   // Fondos de tarjeta
        "ud-gris-800":     "#2E2E2E",   // Sidebar oscuro
        "ud-gris-900":     "#1A1A1A",   // Sidebar más oscuro (hover)

        // Estados semáforo (para badges de pólizas)
        "estado-activa":     "#16a34a",
        "estado-activa-bg":  "#f0fdf4",
        "estado-vencer":     "#d97706",
        "estado-vencer-bg":  "#fffbeb",
        "estado-vencida":    "#dc2626",
        "estado-vencida-bg": "#fef2f2",
        "estado-borrador":   "#6b7280",
        "estado-borrador-bg":"#f9fafb",
        "estado-renovada":   "#2563eb",
        "estado-renovada-bg":"#eff6ff",
        "estado-anulada":    "#7c3aed",
        "estado-anulada-bg": "#f5f3ff",
      },

      // ───────────────────────────────────────────────────────────────────────
      // TIPOGRAFÍA — Lora (titulares) + Hind (textos)
      // Las fuentes se importan desde Google Fonts en index.html
      // Uso: font-titular (Lora), font-texto (Hind)
      // ───────────────────────────────────────────────────────────────────────
      fontFamily: {
        "titular": ["'Lora'", "Georgia", "serif"],
        "texto":   ["'Hind'", "system-ui", "sans-serif"],
      },

      // ───────────────────────────────────────────────────────────────────────
      // SOMBRAS PERSONALIZADAS
      // ───────────────────────────────────────────────────────────────────────
      boxShadow: {
        "ud-card":  "0 1px 3px rgba(89,89,89,0.08), 0 4px 12px rgba(89,89,89,0.06)",
        "ud-hover": "0 4px 16px rgba(204,102,40,0.12), 0 1px 4px rgba(89,89,89,0.08)",
        "ud-sidebar":"4px 0 24px rgba(26,26,26,0.15)",
      },

      // ───────────────────────────────────────────────────────────────────────
      // ANIMACIONES
      // ───────────────────────────────────────────────────────────────────────
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%":   { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
      },
      animation: {
        "fade-in":  "fade-in 0.35s ease-out both",
        "slide-in": "slide-in 0.3s ease-out both",
        "pulse-dot":"pulse-dot 1.8s ease-in-out infinite",
      },
    },
  },

  plugins: [],
}
