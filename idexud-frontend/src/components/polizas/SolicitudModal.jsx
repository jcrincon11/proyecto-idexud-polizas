/**
 * SolicitudModal.jsx
 *
 * Formulario PMO para crear una nueva solicitud de garantía.
 * Usa createPortal (mismo patrón que PolizaModal) para evitar
 * problemas de z-index/overflow de ancestros.
 *
 * Props:
 *   open      boolean
 *   onClose   () => void
 *   onSubmit  async (data) => solicitudCreada
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { proyectosApi } from '../../services/api';
import {
  X, Loader2, Search, Link2, DollarSign,
  ClipboardList, CheckCircle2,
} from 'lucide-react';

// ── Catálogos ─────────────────────────────────────────────────────────────────

const TIPOS_GARANTIA = [
  { value: 'POLIZA_CUMPLIMIENTO', label: 'Póliza de Cumplimiento' },
  { value: 'POLIZA_ANTICIPO',     label: 'Póliza de Anticipo' },
  { value: 'POLIZA_CALIDAD',      label: 'Póliza de Calidad' },
  { value: 'GARANTIA_BANCARIA',   label: 'Garantía Bancaria' },
  { value: 'PAGARE',              label: 'Pagaré' },
];

const LABEL_TIPO = Object.fromEntries(TIPOS_GARANTIA.map((t) => [t.value, t.label]));

// ── Primitivas de formulario ──────────────────────────────────────────────────

function Field({ label, required, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-gray-400 leading-snug">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}

// ── Ticket de éxito ───────────────────────────────────────────────────────────

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

function TicketExito({ solicitud, onCerrar }) {
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

  return (
    <>
      {/* Cuerpo scrollable */}
      <div className="flex-1 overflow-y-auto px-7 py-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-200/60">
          <CheckCircle2 size={40} className="text-white" />
        </div>
        <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-[0.15em] mb-1">
          Solicitud Creada
        </p>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-7 leading-tight">
          ¡Todo listo para revisión!
        </h2>

        {/* Ticket */}
        <div className="w-full border border-gray-200 rounded-2xl overflow-hidden">
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

        {/* Aviso */}
        <div className="mt-4 w-full flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
          <span className="text-lg flex-shrink-0">📋</span>
          <p className="text-sm text-blue-800 leading-relaxed">
            La solicitud está en cola para revisión PMO. Recibirás una
            notificación cuando avance al siguiente estado.
          </p>
        </div>
      </div>

      {/* Pie fijo */}
      <div className="px-7 py-5 border-t border-gray-100 bg-gray-50/70 flex-shrink-0">
        <button
          onClick={onCerrar}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-sm shadow-emerald-200"
        >
          Entendido ✓
        </button>
      </div>
    </>
  );
}

// ── Combobox buscador de proyectos SIEXUD ─────────────────────────────────────

function ProyectoCombobox({ onSelect }) {
  const [query, setQuery]       = useState('');
  const [opciones, setOpciones] = useState([]);
  const [abierto, setAbierto]   = useState(false);
  const [cargando, setCargando] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  const buscar = useCallback(async (texto) => {
    if (!texto || texto.length < 2) { setOpciones([]); return; }
    setCargando(true);
    try {
      const { data } = await proyectosApi.opciones(texto);
      setOpciones(data ?? []);
    } catch {
      setOpciones([]);
    } finally {
      setCargando(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setAbierto(true);
    if (val === '') onSelect(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(val), 300);
  };

  const handleSeleccionar = (op) => {
    setQuery(op.nombre);
    setAbierto(false);
    onSelect(op);
  };

  const handleLimpiar = () => {
    setQuery('');
    setOpciones([]);
    setAbierto(false);
    onSelect(null);
  };

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.length >= 2) setAbierto(true); }}
          placeholder="Buscar por nombre, código contable o entidad…"
          className="ud-input pl-9 pr-8"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleLimpiar}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      {abierto && query.length >= 2 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
          {cargando && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">Buscando…</div>
          )}
          {!cargando && opciones.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              Sin resultados. Sincroniza proyectos desde la vista Proyectos SIEXUD.
            </div>
          )}
          {!cargando && opciones.map((op) => (
            <button
              key={op.numero_interno}
              type="button"
              onMouseDown={() => handleSeleccionar(op)}
              className="block w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              <p className="text-sm font-semibold text-gray-900 leading-snug truncate">
                {op.nombre.length > 70 ? op.nombre.substring(0, 70) + '…' : op.nombre}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {op.codigo_contable && (
                  <span className="font-mono">{op.codigo_contable}</span>
                )}
                {op.codigo_contable && op.entidad_contratante && ' · '}
                {op.entidad_contratante && op.entidad_contratante.substring(0, 50)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

export default function SolicitudModal({ open, onClose, onSubmit }) {
  const { usuario } = useAuth();

  // "formulario" | "cargando" | "exito"
  const [vista, setVista]                       = useState('formulario');
  const [solicitudCreada, setSolicitudCreada]   = useState(null);
  const [form, setForm]                         = useState({
    descripcion: '', tipo_garantia: '', enlace_nextcloud: '',
    valor_contrato: '', centro_costos: '',
  });
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [errors, setErrors]   = useState({});
  const firstInputRef         = useRef(null);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setVista('formulario');
      setSolicitudCreada(null);
      setForm({ descripcion: '', tipo_garantia: '', enlace_nextcloud: '', valor_contrato: '', centro_costos: '' });
      setProyectoSeleccionado(null);
      setErrors({});
      setTimeout(() => firstInputRef.current?.focus(), 120);
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && vista !== 'cargando') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, vista]);

  const handleSeleccionarProyecto = (op) => {
    setProyectoSeleccionado(op);
    if (op) {
      setForm((f) => ({
        ...f,
        centro_costos:  op.codigo_contable ?? f.centro_costos,
        valor_contrato: op.valor_vigente != null ? String(Math.round(op.valor_vigente)) : f.valor_contrato,
      }));
      if (errors.centro_costos) setErrors((er) => ({ ...er, centro_costos: null }));
    } else {
      setForm((f) => ({ ...f, centro_costos: '', valor_contrato: '' }));
    }
  };

  const set = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    if (errors[campo]) setErrors((er) => ({ ...er, [campo]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.descripcion || form.descripcion.trim().length < 10)
      e.descripcion = 'Mínimo 10 caracteres.';
    if (!form.tipo_garantia)
      e.tipo_garantia = 'Selecciona el tipo de garantía.';
    if (!form.enlace_nextcloud || form.enlace_nextcloud.trim().length < 5)
      e.enlace_nextcloud = 'Ingresa la ruta o URL en NextCloud.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erroresNuevos = validar();
    if (Object.keys(erroresNuevos).length) {
      setErrors(erroresNuevos);
      return;
    }
    setVista('cargando');
    try {
      const resultado = await onSubmit({
        descripcion:      form.descripcion.trim(),
        tipo_garantia:    form.tipo_garantia,
        enlace_nextcloud: form.enlace_nextcloud.trim(),
        valor_contrato:   form.valor_contrato ? parseFloat(form.valor_contrato) : null,
        centro_costos:    form.centro_costos || null,
      });
      setSolicitudCreada(resultado || {
        id: '—', numero_radicado: 'SOL-DEMO',
        descripcion: form.descripcion.trim(),
        tipo_garantia: form.tipo_garantia,
        created_at: new Date().toISOString(),
      });
      setVista('exito');
    } catch (err) {
      setVista('formulario');
      setErrors({ general: err.message || 'Error al crear la solicitud.' });
    }
  };

  const handleCerrar = () => {
    onClose();
    setTimeout(() => { setVista('formulario'); setSolicitudCreada(null); }, 300);
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={vista !== 'cargando' ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Vista: ÉXITO (ticket de radicado) ────────────────────────── */}
        {vista === 'exito' && solicitudCreada && (
          <TicketExito solicitud={solicitudCreada} onCerrar={handleCerrar} />
        )}

        {/* ── Vista: CARGANDO ──────────────────────────────────────────── */}
        {vista === 'cargando' && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={36} className="text-blue-600 animate-spin" />
            <p className="text-gray-500 text-sm">Creando solicitud…</p>
          </div>
        )}

        {/* ── Vista: FORMULARIO ────────────────────────────────────────── */}
        {vista === 'formulario' && (
          <>
            {/* Cabecera azul PMO */}
            <div className="bg-gradient-to-br from-blue-700 to-indigo-800 px-6 pt-5 pb-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">
                      PMO — Solicitud de Garantía
                    </p>
                    <p className="text-white font-bold text-base leading-snug mt-0.5">
                      Nueva Solicitud
                    </p>
                    {usuario?.nombre && (
                      <p className="text-white/60 text-[10px] mt-0.5 truncate">
                        {usuario.nombre} · {usuario.rol}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCerrar}
                  className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors flex-shrink-0 mt-0.5"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Barra de progreso de flujo */}
              <div className="mt-4 flex gap-1.5">
                {['Tu solicitud', 'Revisión PMO', 'Jurídica', 'Emisión'].map((paso, i) => (
                  <div key={paso} className="flex-1">
                    <div className={`h-1 rounded-full mb-1 ${i === 0 ? 'bg-white' : 'bg-white/25'}`} />
                    <p className={`text-[9px] font-semibold uppercase tracking-wide truncate ${i === 0 ? 'text-white' : 'text-white/50'}`}>
                      {paso}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cuerpo + pie dentro de form para que el submit funcione */}
            <form
              id="form-solicitud"
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col overflow-hidden"
              noValidate
            >
              {/* Cuerpo scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Error global */}
                {errors.general && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                    {errors.general}
                  </div>
                )}

                {/* Descripción */}
                <Field
                  label="Descripción de la garantía"
                  required
                  hint="Describe el objeto del contrato que requiere la garantía."
                  error={errors.descripcion}
                >
                  <textarea
                    ref={firstInputRef}
                    value={form.descripcion}
                    onChange={set('descripcion')}
                    placeholder="Ej: Garantía de cumplimiento para el contrato de construcción..."
                    maxLength={2000}
                    rows={3}
                    className={`ud-input resize-none ${errors.descripcion ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                  />
                  <p className="text-[11px] text-gray-400 text-right -mt-1">
                    {form.descripcion.length}/2000
                  </p>
                </Field>

                {/* Tipo de garantía */}
                <Field label="Tipo de garantía" required error={errors.tipo_garantia}>
                  <select
                    value={form.tipo_garantia}
                    onChange={set('tipo_garantia')}
                    className={`ud-input ${errors.tipo_garantia ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                  >
                    <option value="">Seleccionar tipo…</option>
                    {TIPOS_GARANTIA.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>

                {/* Carpeta NextCloud */}
                <Field
                  label="Carpeta en NextCloud"
                  required
                  hint="URL o ruta donde están los documentos del proyecto."
                  error={errors.enlace_nextcloud}
                >
                  <div className="relative">
                    <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.enlace_nextcloud}
                      onChange={set('enlace_nextcloud')}
                      placeholder="https://nextcloud.empresa.com/s/..."
                      className={`ud-input pl-9 ${errors.enlace_nextcloud ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                    />
                  </div>
                </Field>

                {/* Valor + Centro de costos en grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor del Contrato (COP)" hint="Opcional — en pesos.">
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="number"
                        value={form.valor_contrato}
                        onChange={set('valor_contrato')}
                        placeholder="0"
                        min="0"
                        step="1000"
                        className="ud-input pl-8"
                      />
                    </div>
                  </Field>

                  <Field label="Centro de Costos" hint="Autocompletado desde SIEXUD.">
                    <input
                      type="text"
                      value={form.centro_costos}
                      onChange={set('centro_costos')}
                      placeholder="Código contable"
                      className="ud-input font-mono"
                    />
                  </Field>
                </div>

                {/* Combobox SIEXUD */}
                <Field
                  label="Proyecto SIEXUD"
                  hint="Busca el proyecto institucional — autocompleta código y valor."
                >
                  <ProyectoCombobox onSelect={handleSeleccionarProyecto} />
                  {proyectoSeleccionado && (
                    <div className="mt-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 space-y-0.5">
                      <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                        Proyecto vinculado
                      </p>
                      {proyectoSeleccionado.codigo_contable && (
                        <p className="text-xs text-green-800 font-mono">
                          Código: {proyectoSeleccionado.codigo_contable}
                        </p>
                      )}
                      {proyectoSeleccionado.entidad_contratante && (
                        <p className="text-xs text-green-800 truncate">
                          Entidad: {proyectoSeleccionado.entidad_contratante.substring(0, 60)}
                        </p>
                      )}
                      {proyectoSeleccionado.estado && (
                        <p className="text-xs text-green-800">
                          Estado: {proyectoSeleccionado.estado}
                        </p>
                      )}
                    </div>
                  )}
                </Field>
              </div>

              {/* Pie fijo — dentro del form para que el submit funcione */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 flex-shrink-0">
                <p className="font-texto text-[10px] text-gray-400">
                  <span className="text-red-500">*</span> campos obligatorios
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCerrar}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200 min-w-[140px] justify-center"
                  >
                    Crear Solicitud →
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
