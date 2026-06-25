import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, User, DollarSign, Loader2, Lock, Check, ExternalLink, AlertTriangle, Pencil, X, FileText, Calendar, Shield, Building2, Briefcase, Hash, AlignLeft, Link2, Landmark } from 'lucide-react';
import { usePolizaDetalle, useChecklist } from '../../hooks/usePolizaDetalle';
import { BadgeEstado } from "../../components/ui/Badge";
import { useAuth } from '../../context/AuthContext';
import { progresoDeEstado } from '../../utils/progress';
import { polizasApi } from '../../services/api';

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

/**
 * Campo de texto editable inline.
 * Muestra el valor como texto; al hacer clic en el ícono de lápiz convierte
 * en input. Guarda en el servidor al perder el foco (onBlur) o presionar Enter.
 */
function CampoEditable({ label, valor, campo, polizaId, placeholder, onGuardado }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor ?? '');
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef(null);

  // Sincronizar si el valor externo cambia (p.ej. recarga)
  useEffect(() => { setTexto(valor ?? ''); }, [valor]);

  useEffect(() => {
    if (editando) inputRef.current?.focus();
  }, [editando]);

  const guardar = useCallback(async () => {
    const nuevo = texto.trim();
    const original = (valor ?? '').trim();
    if (nuevo === original) { setEditando(false); return; }

    setGuardando(true);
    try {
      const { data } = await polizasApi.actualizar(polizaId, { [campo]: nuevo || null });
      onGuardado(data);
      toast.success(`${label} actualizado`);
    } catch {
      toast.error(`No se pudo guardar ${label}`);
      setTexto(original);
    } finally {
      setGuardando(false);
      setEditando(false);
    }
  }, [texto, valor, campo, polizaId, label, onGuardado]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); guardar(); }
    if (e.key === 'Escape') { setTexto(valor ?? ''); setEditando(false); }
  };

  if (editando) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          ref={inputRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={guardar}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 text-xs border border-ud-naranja/50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ud-naranja bg-white"
          disabled={guardando}
        />
        {guardando
          ? <Loader2 size={12} className="animate-spin text-gray-400 flex-shrink-0" />
          : <button onMouseDown={(e) => { e.preventDefault(); setTexto(valor ?? ''); setEditando(false); }} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"><X size={13} /></button>
        }
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-visible">
      <span className={`block text-xs font-bold pr-8 break-words leading-snug ${texto ? 'text-blue-600' : 'text-gray-400 italic'}`}>
        {texto || placeholder || 'Sin asignar'}
      </span>
      <button
        onClick={() => setEditando(true)}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-ud-naranja hover:bg-gray-200 transition-colors"
        title={`Editar ${label}`}
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

export default function PolizaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { poliza, loading } = usePolizaDetalle(id);
  const { checklist, guardando, setChecklist, togglePaso } = useChecklist(id);

  // Valores locales para los dos campos editables
  const [centroCosto, setCentroCosto] = useState('');
  const [enlaceActivo, setEnlaceActivo] = useState('');

  useEffect(() => {
    if (poliza?.checklist) setChecklist(poliza.checklist);
    if (poliza) {
      setCentroCosto(poliza.centro_costo_solicitante ?? '');
      setEnlaceActivo(poliza.enlace_soporte_pago ?? '');
    }
  }, [poliza, setChecklist]);

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

  // Callback que recibe la póliza actualizada del servidor y sincroniza estado local
  const handlePolizaActualizada = useCallback((polizaActualizada) => {
    setCentroCosto(polizaActualizada.centro_costo_solicitante ?? '');
    setEnlaceActivo(polizaActualizada.enlace_soporte_pago ?? '');
  }, []);

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
        {enlaceActivo && (
          <a href={enlaceActivo} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md"><ExternalLink size={16} /> Abrir Carpeta</a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* ── Verificación Financiera ──────────────────────────────────── */}
          <div className="ud-card p-5 border-l-4 border-l-green-500">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-ud-gris">
              <DollarSign size={14} className="text-green-600" />
              Verificación Financiera
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Valor de la Prima — solo lectura */}
              <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valor del Contrato</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {(() => {
                    const valorMostrar = poliza.valor_contrato || poliza.valor_asegurado;
                    return valorMostrar
                      ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valorMostrar)
                      : '—';
                  })()}
                </p>
              </div>

              {/* Centro de Costos — editable */}
              <div className="relative bg-gray-50 p-4 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors overflow-visible">
                <div className="flex items-center gap-1.5 mb-1">
                  <Landmark size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Centro de Costos</span>
                </div>
                <div className="mt-1">
                  <CampoEditable
                    label="Centro de Costos"
                    valor={centroCosto}
                    campo="centro_costo_solicitante"
                    polizaId={id}
                    placeholder="Sin asignar"
                    onGuardado={handlePolizaActualizada}
                  />
                </div>
              </div>

              {/* Soporte Documental — editable */}
              <div className="relative bg-gray-50 p-4 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors overflow-visible">
                <div className="flex items-center gap-1.5 mb-1">
                  <Link2 size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Soporte Documental</span>
                </div>
                <div className="mt-1 space-y-1">
                  {enlaceActivo && (
                    <a href={enlaceActivo} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold truncate">
                      <ExternalLink size={11} className="flex-shrink-0" />
                      <span className="truncate">Ver en Nextcloud</span>
                    </a>
                  )}
                  <CampoEditable
                    label="Enlace Soporte"
                    valor={enlaceActivo}
                    campo="enlace_soporte_pago"
                    polizaId={id}
                    placeholder="Pegar URL de Nextcloud…"
                    onGuardado={handlePolizaActualizada}
                  />
                </div>
              </div>
            </div>

            {usuario?.rol === 'FINANCIERA' && (
              <div className="mt-4 p-2 bg-yellow-50 rounded text-[11px] text-yellow-700 flex gap-2">
                <AlertTriangle size={12} /><span>Verifique el pago en el extracto antes de marcar el paso 9.</span>
              </div>
            )}
          </div>

          {/* ── Información Detallada de la Póliza ─────────────────────── */}
          {(() => {
            const MODALIDAD_LABEL = {
              POLIZA_SEGURO: 'Póliza de Seguro',
              PAGARE: 'Pagaré',
              FIDUCIA: 'Fiducia',
              GARANTIA_BANCARIA: 'Garantía Bancaria',
              OTRO: 'Otro',
            };
            const na = (val) => val
              ? <span className="text-sm font-semibold text-gray-900 mt-1 break-words">{val}</span>
              : <span className="text-sm font-semibold text-gray-400 mt-1">N/A</span>;

            const MicroCard = ({ icon: Icon, label, children, full }) => (
              <div className={`relative bg-gray-50 p-4 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors overflow-visible${full ? ' md:col-span-2' : ''}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                </div>
                {children}
              </div>
            );

            return (
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-ud-gris">
                  <FileText size={14} className="text-ud-naranja" />
                  Información Detallada de la Póliza
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MicroCard icon={Shield} label="Tipo de Garantía">
                    {na(poliza.etiqueta_tipo)}
                  </MicroCard>
                  <MicroCard icon={Shield} label="Modalidad">
                    {na(MODALIDAD_LABEL[poliza.modalidad])}
                  </MicroCard>
                  <MicroCard icon={Calendar} label="Vigencia Desde">
                    {na(poliza.vigencia_desde_fmt)}
                  </MicroCard>
                  <MicroCard icon={Calendar} label="Vigencia Hasta">
                    {na(poliza.vigencia_hasta_fmt)}
                  </MicroCard>
                  <MicroCard icon={DollarSign} label="Valor Asegurado">
                    {na(poliza.valor_asegurado_fmt !== '—' ? poliza.valor_asegurado_fmt : null)}
                  </MicroCard>
                  <MicroCard icon={Hash} label="Número de Contrato">
                    {na(poliza.numero_contrato)}
                  </MicroCard>
                  <MicroCard icon={User} label="Contratista">
                    {na(poliza.contratista?.nombre_razon_social)}
                  </MicroCard>
                  <MicroCard icon={Building2} label="Aseguradora">
                    {na(poliza.aseguradora?.nombre)}
                  </MicroCard>
                  <MicroCard icon={Briefcase} label="Corredor" full>
                    {poliza.corredor
                      ? <span className="text-sm font-semibold text-gray-900 mt-1 break-words">{poliza.corredor.nombre_corredor} — {poliza.corredor.empresa}</span>
                      : <span className="text-sm font-semibold text-gray-400 mt-1">No registrado</span>}
                  </MicroCard>
                  <MicroCard icon={AlignLeft} label="Notas Internas" full>
                    {poliza.notas_internas
                      ? <p className="text-sm font-semibold text-gray-900 mt-1 whitespace-pre-wrap leading-relaxed">{poliza.notas_internas}</p>
                      : <span className="text-sm font-semibold text-gray-400 mt-1 italic">Sin notas registradas.</span>}
                  </MicroCard>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="lg:col-span-1 ud-card p-6">
          <h2 className="text-lg font-bold mb-3">Checklist de Flujo de Trabajo</h2>

          {checklist && (() => {
            const { porcentaje, colorHex, completados, totalPasos } = progresoDeEstado(poliza, checklist);
            return (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-ud-gris">Progreso del flujo</span>
                  <span className="text-xs font-bold" style={{ color: colorHex }}>
                    {completados} / {totalPasos} pasos · {porcentaje}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${porcentaje}%`, backgroundColor: colorHex }}
                  />
                </div>
              </div>
            );
          })()}

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
