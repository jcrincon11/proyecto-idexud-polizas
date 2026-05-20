import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, User, DollarSign, Loader2, Lock, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { usePolizaDetalle, useChecklist } from '../../hooks/usePolizaDetalle';
import { BadgeEstado } from "../../components/ui/Badge";
import { useAuth } from '../../context/AuthContext';

const PASOS = [
  { numero: 1, campo: 'paso1_solicitud_recibida', label: 'Solicitud recibida', rol: 'JURIDICA' },
  { numero: 2, campo: 'paso2_docs_verificados', label: 'Docs. verificados', rol: 'JURIDICA' },
  { numero: 3, campo: 'paso3_borrador_revisado', label: 'Borrador revisado', rol: 'JURIDICA' },
  { numero: 4, campo: 'paso4_aprobada_juridica', label: 'Aprobada Jurídica', rol: 'JURIDICA' },
  { numero: 5, campo: 'paso5_emitida_aseguradora', label: 'Emitida Aseguradora', rol: 'JURIDICA' },
  { numero: 6, campo: 'paso6_radicada_idexud', label: 'Radicada Idexud', rol: 'JURIDICA' },
  { numero: 7, campo: 'paso7_ingresada_sistema', label: 'Cargada en SECOP II', rol: 'PMO' },
  { numero: 8, campo: 'paso8_supervisor_notificado', label: 'Supervisor notificado', rol: 'PMO' },
  { numero: 9, campo: 'paso9_incluida_cartera', label: 'Póliza Pagada', rol: 'FINANCIERA' },
  { numero: 10, campo: 'paso10_archivada', label: 'Expediente Cerrado', rol: 'PMO' },
];

function PasoChecklist({ paso, checklist, guardando, onToggle, disabled }) {
  if (!checklist) return null;
  const completado = !!checklist[paso.campo];
  const esGuardando = guardando === paso.campo;

  return (
    <div className={`group flex items-start gap-3 p-3 rounded-xl transition-all ${completado ? 'bg-green-50 border border-green-100' : 'bg-white border border-gray-100'} ${disabled ? 'opacity-50 grayscale' : 'hover:border-ud-naranja/20'}`}>
      <button onClick={() => !esGuardando && !disabled && onToggle(paso.campo, completado)} disabled={esGuardando || disabled} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${completado ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        {esGuardando ? <Loader2 size={11} className="animate-spin" /> : disabled && !completado ? <Lock size={10} className="text-gray-400" /> : completado ? <Check size={12} className="text-white" /> : null}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${completado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{paso.numero}</span>
          <p className={`text-sm font-semibold ${completado ? 'text-green-700 line-through' : 'text-ud-gris'}`}>{paso.label}</p>
          {disabled && !completado && <span className="text-[9px] text-ud-naranja font-bold uppercase">Solo {paso.rol}</span>}
        </div>
      </div>
    </div>
  );
}

export default function PolizaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { poliza, loading } = usePolizaDetalle(id);
  const { checklist, guardando, setChecklist, togglePaso } = useChecklist(id);

  useEffect(() => { if (poliza?.checklist) setChecklist(poliza.checklist); }, [poliza, setChecklist]);

  const handleTogglePaso = useCallback(async (campo, completado) => {
    try {
      await togglePaso(campo, completado);
      const paso = PASOS.find((p) => p.campo === campo);
      if (!completado) {
        toast.success(`✓ ${paso?.label ?? 'Paso completado'}`, { duration: 2500 });
      } else {
        toast(`${paso?.label ?? 'Paso'} desmarcado`, { duration: 2000 });
      }
    } catch {
      toast.error('No se pudo actualizar el paso. Intente de nuevo.');
    }
  }, [togglePaso]);

  const puedeEditar = (pasoRol) => {
    if (!usuario || !usuario.rol) return false;
    const rolActual = usuario.rol.toUpperCase();
    if (rolActual === 'ADMIN' || rolActual === 'DIRECTOR') return true;
    return rolActual === pasoRol.toUpperCase();
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando expediente...</div>;
  if (!poliza) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/polizas')} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ud-gris">Póliza: {poliza.numero_poliza || 'EN TRÁMITE'}</h1>
              <BadgeEstado estado={poliza.estado} />
            </div>
            <p className="text-xs text-gray-400 mt-1">ID Solicitud: {poliza.id}</p>
          </div>
        </div>
        {poliza.enlace_nextcloud && (
          <a href={poliza.enlace_nextcloud} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md"><ExternalLink size={16} /> Abrir Carpeta</a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="ud-card p-5 border-l-4 border-l-green-500">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><DollarSign size={14} className="text-green-600" /> Verificación Financiera</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Valor de la Prima:</span> <span className="text-sm font-bold text-ud-gris">{poliza.valor_prima_fmt || "$ 0.00"}</span></div>
              <div className="bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Dato para Tesorería:</p>
                <div className="flex justify-between"><span className="text-xs font-medium">Centro de Costos:</span><span className="text-xs font-bold text-blue-600">{poliza.centro_de_costos || 'Sin asignar'}</span></div>
              </div>
              {usuario?.rol === 'FINANCIERA' && (
                <div className="mt-4 p-2 bg-yellow-50 rounded text-[11px] text-yellow-700 flex gap-2"><AlertTriangle size={12} /><span>Verifique el pago en el extracto antes de marcar el paso 9.</span></div>
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 ud-card p-6">
          <h2 className="text-lg font-bold mb-4">Checklist de Flujo de Trabajo</h2>
          <div className="space-y-2">
            {PASOS.map((paso) => (
              <PasoChecklist key={paso.campo} paso={paso} checklist={checklist} guardando={guardando} onToggle={handleTogglePaso} disabled={!puedeEditar(paso.rol)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}