/**
 * SolicitudDetailModal.jsx
 *
 * Props
 *   isOpen     boolean    — controla visibilidad
 *   onClose    () => void — cierra el modal
 *   solicitud  object     — datos de la solicitud PMO
 */
import { useEffect } from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

// ── Constantes de presentación ────────────────────────────────────────────────

const TIPO_LABEL = {
  POLIZA_CUMPLIMIENTO:  'Póliza de Cumplimiento',
  POLIZA_ANTICIPO:      'Póliza de Anticipo',
  POLIZA_CALIDAD:       'Póliza de Calidad',
  GARANTIA_BANCARIA:    'Garantía Bancaria',
  PAGARE:               'Pagaré',
  CUMPLIMIENTO:         'Cumplimiento',
  CORRECTO_MANEJO:      'Correcto Manejo / Anticipo',
  CALIDAD_SERVICIO:     'Calidad del Servicio',
  OTRO:                 'Otro',
};

const ESTADO_BADGE = {
  BORRADOR:             'bg-gray-100 text-gray-600',
  PENDIENTE_REVISION:   'bg-amber-100 text-amber-700',
  ACTIVA:               'bg-green-100 text-green-700',
  POR_VENCER:           'bg-orange-100 text-orange-700',
  VENCIDA:              'bg-red-100 text-red-700',
  RENOVADA:             'bg-emerald-100 text-emerald-700',
  ANULADA:              'bg-slate-100 text-slate-500',
};

function formatCOP(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(v);
}

function formatFechaLarga(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatFechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

// ── Generador de PDF ──────────────────────────────────────────────────────────

function generarPDF(sol) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W    = 210;   // ancho A4 en mm
  const MX   = 18;    // margen izquierdo / derecho
  const NARANJA  = [204, 102, 40];
  const BLANCO   = [255, 255, 255];
  const NEGRO    = [20,  20,  20];
  const GRIS_OSC = [80,  80,  80];
  const GRIS_MED = [140, 140, 140];
  const GRIS_CLR = [240, 240, 240];
  let y = 0;

  // ── Banda superior naranja ─────────────────────────────────────────────────
  doc.setFillColor(...NARANJA);
  doc.rect(0, 0, W, 46, 'F');

  // Logotipo textual
  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('IDEXUD', MX, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Universidad Distrital Francisco José de Caldas', MX, 22);
  doc.text('Sistema de Gestión de Pólizas y Cartera', MX, 27.5);

  // Número de radicado (esquina superior derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('RADICADO', W - MX, 14, { align: 'right' });
  doc.setFontSize(10);
  doc.text(sol.numero_radicado ?? `#${sol.id}`, W - MX, 20, { align: 'right' });

  // Título del documento centrado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...BLANCO);
  doc.text('COMPROBANTE DE RADICACIÓN PMO', W / 2, 38, { align: 'center' });

  y = 56;

  // ── Código comprobante (recuadro prominente) ───────────────────────────────
  doc.setFillColor(...GRIS_CLR);
  doc.setDrawColor(...NARANJA);
  doc.setLineWidth(0.6);
  doc.roundedRect(MX, y, W - MX * 2, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NARANJA);
  doc.text('CÓDIGO COMPROBANTE', W / 2, y + 7.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...NEGRO);
  doc.text(sol.codigo_comprobante ?? '—', W / 2, y + 19, { align: 'center' });

  y += 34;

  // ── Separador sutil ────────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(MX, y, W - MX, y);
  y += 8;

  // ── Función auxiliar para cada campo ──────────────────────────────────────
  const campo = (etiqueta, valor, ancho = W - MX * 2) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NARANJA);
    doc.text(etiqueta.toUpperCase(), MX, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...NEGRO);
    const lineas = doc.splitTextToSize(String(valor ?? '—'), ancho);
    doc.text(lineas, MX, y);
    y += lineas.length * 5 + 5;
  };

  // ── Fila de dos columnas ───────────────────────────────────────────────────
  const colWidth = (W - MX * 2 - 8) / 2;

  const campoPar = (etiq1, val1, etiq2, val2) => {
    const yIni = y;

    // Col izquierda
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NARANJA);
    doc.text(etiq1.toUpperCase(), MX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...NEGRO);
    doc.text(String(val1 ?? '—'), MX, y + 4.5);

    // Col derecha
    const xR = MX + colWidth + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NARANJA);
    doc.text(etiq2.toUpperCase(), xR, yIni);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...NEGRO);
    doc.text(String(val2 ?? '—'), xR, yIni + 4.5);

    y = yIni + 14;
  };

  // ── Campos del comprobante ─────────────────────────────────────────────────
  campoPar(
    'Tipo de Garantía', TIPO_LABEL[sol.tipo_garantia] ?? sol.tipo_garantia,
    'Estado',           sol.estado ?? '—',
  );

  campoPar(
    'Centro de Costos / Área', sol.centro_costos ?? 'PMO — Unidad Ejecutora',
    'Monto Asegurado',         formatCOP(sol.monto_asegurado),
  );

  campo('Descripción del Objeto de la Garantía', sol.descripcion);

  campo('Enlace Soporte Documental (NextCloud)',
    sol.enlace_nextcloud || 'Sin enlace registrado');

  campoPar(
    'Creado por',       sol.creado_por ?? '—',
    'Fecha de Creación', formatFechaCorta(sol.created_at),
  );

  // ── Línea divisoria antes del pie ─────────────────────────────────────────
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(MX, y, W - MX, y);
  y += 6;

  // ── Nota legal ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS_MED);
  const nota =
    'Este comprobante es un documento oficial generado automáticamente por el Sistema de Gestión de Pólizas ' +
    'y Cartera de IDEXUD. Consérvelo como soporte de su trámite ante la Unidad PMO.';
  const notaLineas = doc.splitTextToSize(nota, W - MX * 2);
  doc.text(notaLineas, MX, y);
  y += notaLineas.length * 4 + 6;

  // ── Pie de página naranja ─────────────────────────────────────────────────
  doc.setFillColor(...NARANJA);
  doc.rect(0, 282, W, 15, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BLANCO);
  doc.text(
    `Ref: ${sol.codigo_comprobante ?? '—'}   ·   Generado el ${formatFechaCorta(new Date().toISOString())}`,
    W / 2, 291, { align: 'center' },
  );

  // ── Guardar ───────────────────────────────────────────────────────────────
  const nombreArchivo = `comprobante-${sol.codigo_comprobante ?? 'PMO'}.pdf`;
  doc.save(nombreArchivo);
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SolicitudDetailModal({ isOpen, onClose, solicitud }) {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !solicitud) return null;

  const badgeCls = ESTADO_BADGE[solicitud.estado] ?? 'bg-gray-100 text-gray-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── CABECERA ──────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#CC6628] to-[#a0511f] px-6 pt-5 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">
                  Comprobante de Radicación PMO
                </p>
                <p className="text-white font-bold text-base leading-snug mt-0.5">
                  {solicitud.numero_radicado ?? `Solicitud #${solicitud.id}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors flex-shrink-0 mt-0.5"
            >
              <X size={16} />
            </button>
          </div>

          {/* Código comprobante resaltado */}
          <div className="mt-4 bg-white/10 border border-white/25 rounded-xl px-4 py-3">
            <p className="text-white/60 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">
              Código Comprobante
            </p>
            <p className="font-mono text-white font-bold text-2xl tracking-[0.12em]">
              {solicitud.codigo_comprobante ?? '—'}
            </p>
          </div>
        </div>

        {/* ── CUERPO ────────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[52vh]">

          {/* Fila: Estado + Tipo */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeCls}`}>
              {solicitud.estado ?? '—'}
            </span>
            <span className="text-xs text-gray-400">
              {TIPO_LABEL[solicitud.tipo_garantia] ?? solicitud.tipo_garantia ?? '—'}
            </span>
          </div>

          {/* Centro de Costos */}
          <div>
            <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-1">
              Centro de Costos / Área
            </p>
            <p className="text-sm text-gray-700">
              {solicitud.centro_costos ?? 'PMO — Unidad Ejecutora'}
            </p>
          </div>

          {/* Descripción */}
          <div>
            <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-1">
              Descripción del Objeto
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {solicitud.descripcion ?? '—'}
            </p>
          </div>

          {/* Monto */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-0.5">
              Monto Asegurado
            </p>
            <p className="text-xl font-bold text-gray-800">
              {solicitud.monto_asegurado != null
                ? formatCOP(solicitud.monto_asegurado)
                : <span className="text-sm font-normal text-gray-400">Sin definir</span>
              }
            </p>
          </div>

          {/* Enlace NextCloud */}
          <div>
            <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-1">
              Soporte Documental (NextCloud)
            </p>
            {solicitud.enlace_nextcloud ? (
              <a
                href={solicitud.enlace_nextcloud}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#CC6628] hover:text-[#a0511f] hover:underline font-medium transition-colors"
              >
                <ExternalLink size={13} />
                Ver documentos en NextCloud
              </a>
            ) : (
              <p className="text-sm text-gray-400 italic">Sin enlace registrado.</p>
            )}
          </div>

          {/* Metadatos: creado por + fecha */}
          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-gray-100">
            <div>
              <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-1">
                Creado por
              </p>
              <p className="text-xs text-gray-700 break-all">
                {solicitud.creado_por ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-1">
                Fecha de Creación
              </p>
              <p className="text-xs text-gray-700 capitalize">
                {formatFechaLarga(solicitud.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* ── PIE: ACCIONES ─────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            Cerrar
          </button>

          <button
            onClick={() => generarPDF(solicitud)}
            className="inline-flex items-center gap-2 bg-[#CC6628] hover:bg-[#a0511f] active:scale-95 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-orange-200"
          >
            <Download size={15} />
            Descargar Comprobante PDF
          </button>
        </div>

      </div>
    </div>
  );
}
