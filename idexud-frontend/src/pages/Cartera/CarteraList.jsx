import { useState, useMemo } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useCartera, useCarteraResumen } from "../../hooks/useCartera";
import CarteraResumenCard, { CarteraResumenSkeleton } from "../../components/cartera/CarteraResumenCard";
import DashboardHeader from "../../components/layout/DashboardHeader";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const ESTADO_CONFIG = {
  PENDIENTE_REINTEGRO: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-800 border border-amber-300",
    dot: "bg-amber-500",
  },
  ABONADO: {
    label: "Abonado",
    className: "bg-blue-100 text-blue-800 border border-blue-300",
    dot: "bg-blue-500",
  },
  PAGADO: {
    label: "Pagado",
    className: "bg-green-100 text-green-800 border border-green-300",
    dot: "bg-green-500",
  },
};

const formatCOP = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);

const formatFecha = (isoDate) => {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun",
                 "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(day)} ${meses[parseInt(month) - 1]}. ${year}`;
};

// ─── BADGE ESTADO ─────────────────────────────────────────────────────────────

function BadgeEstadoCartera({ estado }) {
  const cfg = ESTADO_CONFIG[estado] ?? {
    label: estado,
    className: "bg-gray-100 text-gray-700 border border-gray-300",
    dot: "bg-gray-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── SKELETON DE CARGA ────────────────────────────────────────────────────────

function SkeletonFila() {
  return (
    <tr className="animate-pulse">
      {[40, 120, 140, 120, 80, 90, 80, 48, 64].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3 bg-gray-100 rounded-full" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── BANNER DE ERROR ──────────────────────────────────────────────────────────

function BannerError({ mensaje, onReintentar }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 mb-4 text-sm">
      <div className="flex items-center gap-3">
        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span className="text-red-700 font-medium">{mensaje}</span>
      </div>
      <button
        onClick={onReintentar}
        className="flex-shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}

// ─── MODAL EDICIÓN ────────────────────────────────────────────────────────────

function EditarModal({ poliza, guardando, onClose, onSave }) {
  const [form, setForm] = useState({
    orden_pago_numero:  poliza.orden_pago_numero  || "",
    orden_pago_fecha:   poliza.orden_pago_fecha   || "",
    enlace_soporte_pago: poliza.enlace_soporte_pago || "",
    estado_cartera:     poliza.estado_cartera     || "PENDIENTE_REINTEGRO",
  });

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => !guardando && e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#A6A6A6] font-medium uppercase tracking-widest">
              Módulo de Cartera
            </p>
            <h2 className="text-white font-semibold text-base mt-0.5">
              Registrar / Actualizar Pago
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="text-[#A6A6A6] hover:text-white transition-colors p-1 disabled:opacity-40"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info póliza */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#CC6628]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#CC6628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{poliza.numero_poliza}</p>
            <p className="text-xs text-gray-500">
              {poliza.aseguradora} · {formatCOP(poliza.valor_poliza)}
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Estado de Cartera
            </label>
            <select
              name="estado_cartera"
              value={form.estado_cartera}
              onChange={handleChange}
              disabled={guardando}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-[#CC6628]/30 focus:border-[#CC6628]
                         bg-white disabled:opacity-60"
            >
              <option value="PENDIENTE_REINTEGRO">Pendiente de Reintegro</option>
              <option value="ABONADO">Abonado</option>
              <option value="PAGADO">Pagado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Número de Orden de Pago
            </label>
            <input
              type="text"
              name="orden_pago_numero"
              value={form.orden_pago_numero}
              onChange={handleChange}
              disabled={guardando}
              placeholder="Ej: OP-2024-0531"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CC6628]/30
                         focus:border-[#CC6628] disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Fecha de la Orden de Pago
            </label>
            <input
              type="date"
              name="orden_pago_fecha"
              value={form.orden_pago_fecha}
              onChange={handleChange}
              disabled={guardando}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-[#CC6628]/30 focus:border-[#CC6628]
                         disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Enlace Soporte de Pago (Nextcloud)
            </label>
            <input
              type="url"
              name="enlace_soporte_pago"
              value={form.enlace_soporte_pago}
              onChange={handleChange}
              disabled={guardando}
              placeholder="https://nextcloud.udistrital.edu.co/s/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CC6628]/30
                         focus:border-[#CC6628] disabled:opacity-60"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800
                       hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={guardando}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold
                       bg-[#CC6628] hover:bg-[#b05820] text-white rounded-lg transition-colors
                       shadow-sm disabled:opacity-60 disabled:cursor-not-allowed min-w-[140px] justify-center"
          >
            {guardando ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Guardando…
              </>
            ) : (
              "Guardar Cambios"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function CarteraList() {
  const { cartera, loading, error, actualizarRegistro, refetch } = useCartera();
  const { resumen, totales, loading: loadingResumen } = useCarteraResumen();

  // ── UI local ─────────────────────────────────────────────────────────────
  const [busqueda,       setBusqueda]       = useState("");
  const [filtroEstado,   setFiltroEstado]   = useState("TODOS");
  const [polizaEditando, setPolizaEditando] = useState(null);
  const [filaActiva,     setFilaActiva]     = useState(null);
  const [guardandoModal, setGuardandoModal] = useState(false);

  // ── KPI calculados sobre la lista completa ───────────────────────────────
  const kpis = useMemo(() => {
    const pendientes = cartera.filter((p) => p.estado_cartera === "PENDIENTE_REINTEGRO");
    const abonados   = cartera.filter((p) => p.estado_cartera === "ABONADO");
    const pagados    = cartera.filter((p) => p.estado_cartera === "PAGADO");
    return {
      pendientes:     pendientes.length,
      abonados:       abonados.length,
      pagados:        pagados.length,
      // Number() convierte null/undefined/string a número; || 0 descarta NaN
      totalPendiente: pendientes.reduce((s, p) => s + (Number(p.valor_poliza) || 0), 0),
      totalAbonado:   abonados.reduce(  (s, p) => s + (Number(p.valor_poliza) || 0), 0),
      totalPagado:    pagados.reduce(   (s, p) => s + (Number(p.valor_poliza) || 0), 0),
    };
  }, [cartera]);

  // ── Filtrado reactivo ────────────────────────────────────────────────────
  const datosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return cartera.filter((p) => {
      const matchEstado = filtroEstado === "TODOS" || p.estado_cartera === filtroEstado;
      const matchBusqueda =
        !q ||
        (p.numero_poliza ?? "").toLowerCase().includes(q) ||
        (p.aseguradora ?? "").toLowerCase().includes(q) ||
        (p.centro_costo_solicitante ?? "").toLowerCase().includes(q) ||
        (p.orden_pago_numero && p.orden_pago_numero.toLowerCase().includes(q));
      return matchEstado && matchBusqueda;
    });
  }, [cartera, busqueda, filtroEstado]);

  // ── Guardar cambios del modal ────────────────────────────────────────────
  // `cambios` contiene solo los 4 campos del formulario; el hook decide
  // si persiste en mock (local) o en la API real (PATCH).
  const handleGuardar = async (cambios) => {
    setGuardandoModal(true);
    // Omitir strings vacíos: Pydantic rechaza "" como valor de date con 422
    const payload = Object.fromEntries(
      Object.entries(cambios).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );
    try {
      await actualizarRegistro(polizaEditando.id, payload);
      setPolizaEditando(null);
      setFilaActiva(polizaEditando.id);
      toast.success("Registro actualizado", {
        description: `Póliza ${polizaEditando.numero_poliza} guardada correctamente.`,
      });
      setTimeout(() => setFilaActiva(null), 2000);
    } catch (err) {
      console.error('[Cartera] Error guardando registro:', {
        id: polizaEditando.id,
        status: err.response?.status,
        detail: err.response?.data?.detail,
        payload,
      });
      toast.error(err?.mensajeUsuario ?? "Error al guardar los cambios.");
    } finally {
      setGuardandoModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-['Hind',sans-serif]">

      {/* ── CABECERA ── */}
      <DashboardHeader
        title="Control de Cartera"
        subtitle="Seguimiento de préstamos del fondo IDEXUD y reintegros por proyecto."
        breadcrumb="IDEXUD · Módulo de Cartera"
        accent="#3B82F6"
        accent2="#06B6D4"
        stats={[
          { label: 'REGISTROS',  value: loading ? null : cartera.length,  desc: 'Pólizas en cartera'   },
          { label: 'PENDIENTE',  value: loading ? null : kpis.pendientes,  desc: 'Por reintegrar'        },
          { label: 'ABONADO',    value: loading ? null : kpis.abonados,    desc: 'Pago parcial'          },
          { label: 'PAGADO',     value: loading ? null : kpis.pagados,     desc: 'Reintegro completo'    },
        ]}
      />

      {/* ── BANNER DE ERROR ── */}
      {error && <BannerError mensaje={error} onReintentar={refetch} />}

      {/* ── RESUMEN POR CORREDOR (GET /cartera/resumen) ── */}
      {(loadingResumen || resumen.length > 0) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Resumen por Corredor</h2>
            <span className="text-xs text-gray-400 font-normal normal-case">· Agrupado por intermediario de seguros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {loadingResumen
              ? Array.from({ length: 3 }).map((_, i) => <CarteraResumenSkeleton key={i} />)
              : resumen.map((item) => <CarteraResumenCard key={item.corredor_id ?? item.corredor_nombre} item={item} />)
            }
          </div>
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total pólizas</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">
            {loading ? <span className="inline-block w-8 h-7 bg-gray-100 rounded animate-pulse" /> : cartera.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pendientes</p>
          <p className="text-3xl font-bold text-amber-700 mt-1">
            {loading ? <span className="inline-block w-8 h-7 bg-amber-50 rounded animate-pulse" /> : kpis.pendientes}
          </p>
          {!loading && <p className="text-xs text-amber-500 mt-0.5">{formatCOP(kpis.totalPendiente)}</p>}
        </div>
        <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Abonados</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">
            {loading ? <span className="inline-block w-8 h-7 bg-blue-50 rounded animate-pulse" /> : kpis.abonados}
          </p>
          {!loading && <p className="text-xs text-blue-500 mt-0.5">{formatCOP(kpis.totalAbonado)}</p>}
        </div>
        <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Pagados</p>
          <p className="text-3xl font-bold text-green-700 mt-1">
            {loading ? <span className="inline-block w-8 h-7 bg-green-50 rounded animate-pulse" /> : kpis.pagados}
          </p>
          {!loading && <p className="text-xs text-green-600 mt-0.5">{formatCOP(kpis.totalPagado)}</p>}
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-0 p-4
                      flex flex-wrap gap-3 items-center
                      rounded-b-none border-b-0">
        {/* Buscador — crece, pero respeta el espacio de los controles */}
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por póliza, aseguradora, centro de costo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#CC6628]/30 focus:border-[#CC6628]"
          />
        </div>

        {/* Filtro de estado — ancho fijo para que no se comprima */}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="shrink-0 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                     focus:outline-none focus:ring-2 focus:ring-[#CC6628]/30 focus:border-[#CC6628] bg-white"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE_REINTEGRO">Pendiente de Reintegro</option>
          <option value="ABONADO">Abonado</option>
          <option value="PAGADO">Pagado</option>
        </select>

        {/* Exportar Excel — usa datosFiltrados para respetar la búsqueda activa */}
        <button
          className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold
                     bg-[#1A1A1A] hover:bg-[#333] text-white rounded-lg transition-colors
                     whitespace-nowrap"
          onClick={() => {
            if (datosFiltrados.length === 0) {
              toast.warning("Sin datos para exportar");
              return;
            }
            const filas = datosFiltrados.map((p, idx) => ({
              "#":                  idx + 1,
              "Póliza":             p.numero_poliza ?? "",
              "Aseguradora":        p.aseguradora   ?? "",
              "Centro Costo Sol.":  p.centro_costo_solicitante ?? "",
              "Centro Costo Pag.":  p.centro_costo_pagador     ?? "",
              "Estado Cartera":     p.estado_cartera ?? "",
              "N.° Orden Pago":     p.orden_pago_numero  ?? "",
              "Fecha Orden Pago":   p.orden_pago_fecha   ?? "",
              "Valor Prima (COP)":  Number(p.valor_poliza ?? 0),
              "Enlace Soporte":     p.enlace_soporte_pago ?? "",
            }));

            const ws = XLSX.utils.json_to_sheet(filas);
            ws["!cols"] = [
              { wch: 4 }, { wch: 20 }, { wch: 24 }, { wch: 30 }, { wch: 26 },
              { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 45 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Cartera IDEXUD");
            const fecha = new Date().toISOString().split("T")[0];
            XLSX.writeFile(wb, `cartera-idexud-${fecha}.xlsx`);
            toast.success("Excel generado", {
              description: `${filas.length} registros exportados correctamente.`,
            });
          }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar Excel
        </button>
      </div>

      {/* ── TABLA ── */}
      <div className="bg-white rounded-xl rounded-t-none border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {["#", "Póliza", "Centro Costo Sol.", "Centro Costo Pag.",
                "Estado", "N.° OP", "Fecha OP", "Soporte", "Acciones"].map((col) => (
                <th key={col}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-400
                             uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* Estado de carga */}
            {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonFila key={i} />)}

            {/* Sin resultados */}
            {!loading && datosFiltrados.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                  <svg className="w-10 h-10 mx-auto mb-3 text-gray-200"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  No se encontraron registros con los filtros actuales.
                </td>
              </tr>
            )}

            {/* Filas de datos */}
            {!loading && datosFiltrados.map((poliza, idx) => (
              <tr
                key={poliza.id}
                className={`transition-colors duration-500 group ${
                  filaActiva === poliza.id
                    ? "bg-green-50 ring-1 ring-inset ring-green-200"
                    : "hover:bg-gray-50/60"
                }`}
              >
                <td className="px-4 py-3.5 text-gray-300 font-mono text-xs">
                  {String(idx + 1).padStart(2, "0")}
                </td>

                <td className="px-4 py-3.5">
                  <p className="font-semibold text-gray-800 text-xs font-mono">{poliza.numero_poliza}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{poliza.aseguradora}</p>
                  <p className="text-xs text-[#CC6628] font-medium">{formatCOP(poliza.valor_poliza)}</p>
                </td>

                <td className="px-4 py-3.5 text-gray-600 text-xs max-w-[160px]">
                  <span className="line-clamp-2">{poliza.centro_costo_solicitante}</span>
                </td>

                <td className="px-4 py-3.5 text-gray-600 text-xs max-w-[160px]">
                  <span className="line-clamp-2">{poliza.centro_costo_pagador}</span>
                </td>

                <td className="px-4 py-3.5">
                  <BadgeEstadoCartera estado={poliza.estado_cartera} />
                </td>

                <td className="px-4 py-3.5 font-mono text-xs text-gray-700">
                  {poliza.orden_pago_numero || <span className="text-gray-300">—</span>}
                </td>

                <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                  {formatFecha(poliza.orden_pago_fecha)}
                </td>

                <td className="px-4 py-3.5">
                  {poliza.enlace_soporte_pago ? (
                    <a
                      href={poliza.enlace_soporte_pago}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#CC6628]
                                 hover:text-[#b05820] font-medium"
                      title={poliza.enlace_soporte_pago}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Ver
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  <button
                    onClick={() => setPolizaEditando(poliza)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                               text-[#CC6628] bg-[#CC6628]/8 hover:bg-[#CC6628]/15 rounded-lg
                               transition-colors border border-[#CC6628]/20"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Mostrando{" "}
            <span className="font-semibold text-gray-600">{datosFiltrados.length}</span>{" "}
            de{" "}
            <span className="font-semibold text-gray-600">{cartera.length}</span>{" "}
            registros
          </p>
          <p className="text-xs text-gray-300">IDEXUD · Universidad Distrital</p>
        </div>
      </div>

      {/* ── MODAL ── */}
      {polizaEditando && (
        <EditarModal
          poliza={polizaEditando}
          guardando={guardandoModal}
          onClose={() => !guardandoModal && setPolizaEditando(null)}
          onSave={handleGuardar}
        />
      )}
    </div>
  );
}
