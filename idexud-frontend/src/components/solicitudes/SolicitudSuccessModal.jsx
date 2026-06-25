/**
 * SolicitudSuccessModal.jsx
 *
 * Componente de confirmación standalone que muestra el ticket de radicado
 * tras crear exitosamente una solicitud PMO.
 *
 * Props:
 *   isOpen    boolean    — controla visibilidad
 *   onClose   () => void — cierra el modal
 *   solicitud object     — datos devueltos por el backend
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

const LABEL_TIPO = {
  POLIZA_CUMPLIMIENTO: 'Póliza de Cumplimiento',
  POLIZA_ANTICIPO:     'Póliza de Anticipo',
  POLIZA_CALIDAD:      'Póliza de Calidad',
  GARANTIA_BANCARIA:   'Garantía Bancaria',
  PAGARE:              'Pagaré',
};

function FilaTicket({ label, valor, ultimo = false }) {
  return (
    <div className={`flex justify-between items-start gap-4 py-2.5 ${!ultimo ? 'border-b border-gray-200' : ''}`}>
      <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-900 font-medium text-right leading-snug">
        {valor}
      </span>
    </div>
  );
}

export default function SolicitudSuccessModal({ isOpen, onClose, solicitud }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !solicitud) return null;

  const radicado = solicitud.numero_radicado
    || `SOL-${new Date().getFullYear()}-${String(solicitud.id).padStart(5, '0')}`;

  const fecha = solicitud.created_at
    ? new Date(solicitud.created_at).toLocaleString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cuerpo scrollable ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-7 py-8">

          {/* Ícono de éxito + título */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-200/60">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-[0.15em] mb-1">
              Solicitud Creada
            </p>
            <h2 className="text-2xl font-bold text-gray-900 text-center leading-tight">
              ¡Todo listo para revisión!
            </h2>
          </div>

          {/* Ticket de radicado */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            {/* Header del ticket */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-6 py-5">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mb-1">
                N° de Radicado
              </p>
              <p className="font-mono text-white font-bold text-2xl tracking-wider">
                {radicado}
              </p>
            </div>

            {/* Separador estilo ticket */}
            <div className="relative h-5 bg-gray-50 flex items-center">
              <div style={{ position: 'absolute', left: '-10px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', border: '1.5px solid #e5e7eb' }} />
              <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-4" />
              <div style={{ position: 'absolute', right: '-10px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', border: '1.5px solid #e5e7eb' }} />
            </div>

            {/* Cuerpo del ticket */}
            <div className="px-6 pb-5 pt-2 bg-gray-50">
              <FilaTicket
                label="Descripción"
                valor={solicitud.descripcion?.length > 60
                  ? solicitud.descripcion.substring(0, 60) + '…'
                  : solicitud.descripcion}
              />
              <FilaTicket
                label="Tipo de garantía"
                valor={LABEL_TIPO[solicitud.tipo_garantia] ?? solicitud.tipo_garantia}
              />
              <FilaTicket
                label="Estado"
                valor={
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    BORRADOR
                  </span>
                }
              />
              <FilaTicket label="Fecha de creación" valor={fecha} ultimo />
            </div>
          </div>

          {/* Aviso de siguiente paso */}
          <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-lg flex-shrink-0">📋</span>
            <p className="text-sm text-blue-800 leading-relaxed">
              La solicitud está en cola para revisión PMO. Recibirás una
              notificación cuando avance al siguiente estado.
            </p>
          </div>
        </div>

        {/* ── Pie siempre visible ───────────────────────────────────────── */}
        <div className="px-7 py-5 border-t border-gray-100 bg-gray-50/70 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-sm shadow-emerald-200"
          >
            Entendido ✓
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
