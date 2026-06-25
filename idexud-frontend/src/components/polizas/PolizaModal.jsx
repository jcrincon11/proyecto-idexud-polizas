/**
 * src/components/polizas/PolizaModal.jsx
 * ========================================
 * Modal centrado (createPortal) para crear / editar pólizas (área Jurídica).
 * Cabecera naranja UD. Usa React Hook Form con errores 422 mapeados campo a campo.
 * Estados: idle → submitting → success | error
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  X, FileText, AlertCircle, CheckCircle2,
  Loader2, ChevronDown, RefreshCw,
} from 'lucide-react';
import { polizasApi, seedApi } from '../../services/api';

import { useAseguradoras, useContratistas, useCorredores } from '../../hooks/useEntidades';

// ── Constantes ────────────────────────────────────────────────────────────────
const TIPOS = [
  { value: 'CUMPLIMIENTO', label: 'Cumplimiento' },
  { value: 'RCE', label: 'Responsabilidad Civil Extracontractual' },
  { value: 'CALIDAD_SERVICIO', label: 'Calidad del Servicio' },
  { value: 'PAGO_SALARIOS', label: 'Pago de Salarios y Prestaciones' },
  { value: 'ESTABILIDAD_OBRA', label: 'Estabilidad de Obra' },
  { value: 'CORRECTO_MANEJO', label: 'Correcto Manejo del Anticipo' },
  { value: 'RESPONSABILIDAD_CIVIL', label: 'Responsabilidad Civil General' },
  { value: 'OTRO', label: 'Otro' },
];

// ── Subcomponente: campo de formulario ────────────────────────────────────────
function Campo({ label, error, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="ud-label">
        {label}
        {required && <span className="text-estado-vencida ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="font-texto text-[10px] text-ud-gris-claro">{hint}</p>
      )}
      {error && (
        <p className="font-texto text-[11px] text-estado-vencida flex items-center gap-1">
          <AlertCircle size={11} className="flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Subcomponente: banner de éxito ────────────────────────────────────────────
function BannerExito({ numero, onNueva, onCerrar, esEdicion }) {
  const navigate = useNavigate();

  const irACartera = () => {
    onCerrar();
    navigate('/cartera');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-estado-activa-bg flex items-center
                      justify-center mb-5">
        <CheckCircle2 size={32} className="text-estado-activa" />
      </div>
      <h3 className="font-titular font-semibold text-ud-gris text-xl mb-2">
        {esEdicion ? '¡Póliza actualizada!' : '¡Póliza creada!'}
      </h3>
      <p className="font-texto text-sm text-ud-gris-claro mb-1">
        La póliza
      </p>
      <p className="font-titular font-semibold text-ud-naranja text-lg mb-1">
        {numero}
      </p>
      <p className="font-texto text-sm text-ud-gris-claro mb-6">
        {esEdicion
          ? 'fue actualizada correctamente. La tabla se actualizó.'
          : <>fue registrada en estado <strong className="text-ud-gris">Borrador</strong>.<br />La tabla se actualizó automáticamente.</>
        }
      </p>

      {!esEdicion && (
        <div className="w-full max-w-xs mb-5 px-3.5 py-3 rounded-lg text-left
                        bg-ud-naranja-50 border border-ud-naranja/25">
          <p className="font-texto text-[11px] font-semibold text-ud-naranja mb-1">
            Siguiente paso recomendado
          </p>
          <p className="font-texto text-xs text-ud-gris leading-relaxed mb-2.5">
            Ve al módulo de <strong>Cartera</strong> para registrar el centro
            de costos y el estado de reintegro de la prima.
          </p>
          <button onClick={irACartera}
            className="w-full btn-primary justify-center text-xs py-2">
            Ir a Cartera →
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        {!esEdicion && (
          <button onClick={onNueva} className="btn-primary justify-center">
            <FileText size={15} /> Registrar otra póliza
          </button>
        )}
        <button onClick={onCerrar} className="btn-secondary justify-center">
          Volver a la tabla
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PolizaModal({ abierto, onCerrar, onSuccess, polizaEditar = null }) {
  const [exito, setExito] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState(null);
  // null = verificando, false = BD vacía (mostrar seed), true = ya hay datos (ocultar seed)
  const [hayDatos, setHayDatos] = useState(null);
  // Snapshot interno del modo edición: permite que "Registrar otra" cambie a modo creación
  const [polizaEnEdicion, setPolizaEnEdicion] = useState(null);

  const { aseguradoras, loading: asegLoad } = useAseguradoras();
  const { contratistas, loading: contLoad } = useContratistas();
  const { corredores,   loading: corrLoad } = useCorredores();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    trigger,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      numero_poliza: '',
      tipo: '',
      modalidad: 'POLIZA_SEGURO',
      vigencia_desde: '',
      vigencia_hasta: '',
      valor_asegurado: '',
      valor_prima: '',
      porcentaje_cobertura: '',
      numero_contrato: '',
      valor_contrato: '',
      aseguradora_id: '',
      contratista_id: '',
      corredor_id: '',
      requiere_acta_inicio: false,
      notas_internas: '',
    },
  });

  const vigenciaDesde = watch('vigencia_desde');
  const vigenciaHasta = watch('vigencia_hasta');

  // Re-validar vigencia_hasta cuando cambia vigencia_desde (solo si ya tiene valor)
  useEffect(() => {
    if (vigenciaDesde && vigenciaHasta) trigger('vigencia_hasta');
  }, [vigenciaDesde]);

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const h = (e) => { if (e.key === 'Escape') handleCerrar(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [abierto]);

  // Reset al abrir + pre-rellenar si es modo edición
  useEffect(() => {
    if (!abierto) return;
    setExito(null);
    setErrorGlobal(null);
    setSeedMsg(null);

    if (polizaEditar) {
      setPolizaEnEdicion(polizaEditar);
      setHayDatos(true); // ocultar botón seed en modo edición
      reset({
        numero_poliza:        polizaEditar.numero_poliza ?? '',
        tipo:                 polizaEditar.tipo ?? '',
        modalidad:            polizaEditar.modalidad ?? 'POLIZA_SEGURO',
        vigencia_desde:       polizaEditar.vigencia_desde ?? '',
        vigencia_hasta:       polizaEditar.vigencia_hasta ?? '',
        valor_asegurado:      polizaEditar.valor_asegurado != null ? String(polizaEditar.valor_asegurado) : '',
        valor_prima:          polizaEditar.valor_prima != null ? String(polizaEditar.valor_prima) : '',
        porcentaje_cobertura: polizaEditar.porcentaje_cobertura != null ? String(polizaEditar.porcentaje_cobertura) : '',
        numero_contrato:      polizaEditar.numero_contrato ?? '',
        valor_contrato:       polizaEditar.valor_contrato != null ? String(polizaEditar.valor_contrato) : '',
        aseguradora_id:       polizaEditar.aseguradora_id ? String(polizaEditar.aseguradora_id) : '',
        contratista_id:       polizaEditar.contratista_id ? String(polizaEditar.contratista_id) : '',
        corredor_id:          polizaEditar.corredor_id ? String(polizaEditar.corredor_id) : '',
        requiere_acta_inicio: polizaEditar.requiere_acta_inicio ?? false,
        notas_internas:       polizaEditar.notas_internas ?? '',
      });
    } else {
      setPolizaEnEdicion(null);
      setHayDatos(null);
      reset();
      polizasApi.stats()
        .then(({ data }) => setHayDatos((data.total_polizas ?? 0) > 0))
        .catch(() => setHayDatos(false));
    }
  }, [abierto]);

  const handleCerrar = () => {
    if (isDirty && !exito) {
      if (!window.confirm('Hay cambios sin guardar. ¿Desea cerrar sin guardar?')) return;
    }
    onCerrar();
  };

  const handleNueva = () => { reset(); setExito(null); setErrorGlobal(null); setPolizaEnEdicion(null); };

  // ── Seed de demo ──────────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedMsg(null);
    try {
      const { data } = await seedApi.demo();
      setSeedMsg({ tipo: 'ok', texto: data.mensaje });
      onSuccess?.();          // refrescar tabla
    } catch (err) {
      setSeedMsg({ tipo: 'error', texto: err.mensajeUsuario ?? 'Error al sembrar datos.' });
    } finally {
      setSeedLoading(false);
    }
  };

  // ── Mapear errores 422 de FastAPI → campos del formulario ─────────────────
  const mapearErroresFastAPI = (detalles) => {
    if (!Array.isArray(detalles)) return;
    let hayEspecificos = false;

    detalles.forEach(({ loc, msg }) => {
      const campo = loc?.at(-1);
      const camposMapeados = {
        numero_poliza: 'numero_poliza', tipo: 'tipo',
        vigencia_desde: 'vigencia_desde', vigencia_hasta: 'vigencia_hasta',
        valor_asegurado: 'valor_asegurado', valor_prima: 'valor_prima',
        porcentaje_cobertura: 'porcentaje_cobertura',
        aseguradora_id: 'aseguradora_id', contratista_id: 'contratista_id',
        numero_contrato: 'numero_contrato', valor_contrato: 'valor_contrato',
      };
      if (campo && camposMapeados[campo]) {
        setError(camposMapeados[campo], { type: 'server', message: msg });
        hayEspecificos = true;
      }
    });

    if (!hayEspecificos) {
      const msgGeneral = detalles.map((d) => d.msg).join(' • ');
      setErrorGlobal(msgGeneral);
    }
  };

  // ── Submit principal ──────────────────────────────────────────────────────
  const onSubmit = async (valores) => {
    setErrorGlobal(null);

    const payload = Object.fromEntries(
      Object.entries(valores).filter(([, v]) => v !== '' && v !== null)
    );

    // Convertir IDs a entero solo si están en el payload; parseInt(undefined) = NaN → null → FK error en BD
    if ('aseguradora_id' in payload) payload.aseguradora_id = parseInt(payload.aseguradora_id, 10);
    if ('contratista_id' in payload) payload.contratista_id = parseInt(payload.contratista_id, 10);
    if (payload.corredor_id) payload.corredor_id = parseInt(payload.corredor_id, 10);
    else delete payload.corredor_id;
    payload.valor_asegurado = (payload.valor_asegurado || '0').toString();
    if (payload.valor_prima) payload.valor_prima = payload.valor_prima.toString();
    if (payload.valor_contrato) payload.valor_contrato = payload.valor_contrato.toString();
    if (payload.porcentaje_cobertura) payload.porcentaje_cobertura = payload.porcentaje_cobertura.toString();
    payload.requiere_acta_inicio = !!payload.requiere_acta_inicio;

    try {
      let numeroPoliza;
      if (polizaEnEdicion?.id) {
        const { data } = await polizasApi.actualizar(polizaEnEdicion.id, payload);
        numeroPoliza = data.numero_poliza;
      } else {
        const { data } = await polizasApi.crear(payload);
        numeroPoliza = data.numero_poliza;
      }
      setExito(numeroPoliza);
      onSuccess?.();
    } catch (err) {
      console.error('[PolizaModal] Error guardando póliza:', {
        accion: polizaEnEdicion?.id ? `PUT /polizas/${polizaEnEdicion.id}` : 'POST /polizas/',
        status: err.response?.status,
        detail: err.response?.data?.detail,
        payload,
      });
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        mapearErroresFastAPI(detail);
      } else if (err.response?.status === 409) {
        setError('numero_poliza', { type: 'server', message: detail ?? 'Ya existe una póliza con este número.' });
      } else {
        setErrorGlobal(err.mensajeUsuario ?? 'Error inesperado. Intente de nuevo.');
      }
    }
  };

  if (!abierto) return null;

  // Guardamos el render en una variable para pasarlo a createPortal
  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleCerrar}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="modal-titulo"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* ── Cabecera naranja UD ──────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#CC6628] to-[#a0511f] px-6 pt-5 pb-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">
                  Jurídica — Registro de Garantía
                </p>
                <h2 id="modal-titulo" className="text-white font-bold text-base leading-snug mt-0.5">
                  {polizaEnEdicion ? 'Editar Póliza' : 'Nueva Póliza'}
                </h2>
                {polizaEnEdicion && (
                  <p className="text-white/60 text-[10px] mt-0.5 font-mono truncate">
                    {polizaEnEdicion.numero_poliza}
                  </p>
                )}
              </div>
            </div>
            <button onClick={handleCerrar}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors flex-shrink-0 mt-0.5">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Pantalla de éxito ─────────────────────────────────────────── */}
        {exito ? (
          <BannerExito numero={exito} onNueva={handleNueva} onCerrar={handleCerrar} esEdicion={!!polizaEnEdicion} />
        ) : (
          <>
            {/* ── Seed de demo: solo visible si la BD está vacía ────────── */}
            {hayDatos === false && (
              <div className="mx-6 mt-4 flex-shrink-0">
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5
                                rounded-lg bg-ud-gris-50 border border-gray-200">
                  <p className="font-texto text-xs text-ud-gris-claro leading-relaxed">
                    <span className="font-semibold text-ud-gris">¿Base de datos vacía?</span>
                    {' '}Carga 10 pólizas de muestra para la demo.
                  </p>
                  <button
                    type="button"
                    onClick={handleSeed}
                    disabled={seedLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                               bg-ud-naranja text-white font-texto font-medium text-xs
                               hover:bg-ud-naranja-dark disabled:opacity-60 transition-all
                               flex-shrink-0 whitespace-nowrap"
                  >
                    {seedLoading
                      ? <Loader2 size={12} className="animate-spin" />
                      : <RefreshCw size={12} />}
                    Sembrar demo
                  </button>
                </div>
                {seedMsg && (
                  <p className={`font-texto text-[11px] mt-1.5 px-1
                                 ${seedMsg.tipo === 'ok' ? 'text-estado-activa' : 'text-estado-vencida'}`}>
                    {seedMsg.tipo === 'ok' ? '✓ ' : '✗ '}{seedMsg.texto}
                  </p>
                )}
              </div>
            )}

            {/* ── Error global ──────────────────────────────────────────── */}
            {errorGlobal && (
              <div className="mx-6 mt-3 flex items-start gap-2 px-3.5 py-3 rounded-lg
                              bg-estado-vencida-bg border border-estado-vencida/20 flex-shrink-0">
                <AlertCircle size={14} className="text-estado-vencida flex-shrink-0 mt-0.5" />
                <p className="font-texto text-xs text-estado-vencida leading-relaxed">
                  {errorGlobal}
                </p>
              </div>
            )}

            {/* ── Formulario (AQUÍ ESTÁ EL SCROLL INTERNO) ───────────────── */}
            <form
              id="form-poliza"
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white"
              noValidate
            >

              {/* Número de póliza */}
              <Campo label="Número de Póliza" required error={errors.numero_poliza?.message}>
                <input
                  {...register('numero_poliza', {
                    required: 'El número de póliza es obligatorio.',
                    minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                    validate: (v) =>
                      /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(v.trim())
                        || 'Debe contener al menos una letra (no solo números).',
                  })}
                  placeholder="Ej: CU-2024-001234"
                  className={`ud-input ${errors.numero_poliza ? 'border-estado-vencida ring-1 ring-estado-vencida/30' : ''}`}
                />
              </Campo>

              {/* Tipo y Modalidad en fila */}
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Tipo de Garantía" required error={errors.tipo?.message}>
                  <div className="relative">
                    <select
                      {...register('tipo', { required: 'Seleccione un tipo.' })}
                      className={`ud-input appearance-none pr-8 bg-white
                        ${errors.tipo ? 'border-estado-vencida ring-1 ring-estado-vencida/30' : ''}`}
                    >
                      <option value="">Seleccione…</option>
                      {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ud-gris-claro pointer-events-none" />
                  </div>
                </Campo>

                <Campo label="Modalidad">
                  <div className="relative">
                    <select {...register('modalidad')} className="ud-input appearance-none pr-8 bg-white">
                      <option value="POLIZA_SEGURO">Póliza de Seguro</option>
                      <option value="PAGARE">Pagaré</option>
                      <option value="FIDUCIA">Fiducia</option>
                      <option value="GARANTIA_BANCARIA">Garantía Bancaria</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ud-gris-claro pointer-events-none" />
                  </div>
                </Campo>
              </div>

              {/* Vigencia */}
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Vigencia Desde" required error={errors.vigencia_desde?.message}>
                  <input type="date"
                    {...register('vigencia_desde', {
                      required: 'La fecha de inicio es obligatoria.',
                    })}
                    className={`ud-input ${errors.vigencia_desde ? 'border-estado-vencida ring-1 ring-estado-vencida/30' : ''}`}
                  />
                </Campo>
                <Campo label="Vigencia Hasta" required error={errors.vigencia_hasta?.message}>
                  <input type="date"
                    {...register('vigencia_hasta', {
                      required: 'La fecha de fin es obligatoria.',
                      validate: (v) => {
                        if (!vigenciaDesde) return true;
                        return v > vigenciaDesde || 'La fecha de fin debe ser posterior a la fecha de inicio.';
                      },
                    })}
                    min={vigenciaDesde || undefined}
                    className={`ud-input ${errors.vigencia_hasta ? 'border-estado-vencida ring-1 ring-estado-vencida/30' : ''}`}
                  />
                </Campo>
              </div>

              {/* Valores económicos */}
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Monto Asegurado (COP)"
                  error={errors.valor_asegurado?.message}
                  hint="Lo diligencia Jurídica. Dejar en 0 si aún no se conoce.">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-texto text-sm text-ud-gris-claro">$</span>
                    <input type="number" step="0.01" min="0"
                      {...register('valor_asegurado')}
                      placeholder="0"
                      className="ud-input pl-7"
                    />
                  </div>
                </Campo>
                <Campo label="Valor Prima (COP)" error={errors.valor_prima?.message}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-texto text-sm text-ud-gris-claro">$</span>
                    <input type="number" step="0.01" min="0"
                      {...register('valor_prima')}
                      placeholder="450000"
                      className="ud-input pl-7"
                    />
                  </div>
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Campo label="% Cobertura" error={errors.porcentaje_cobertura?.message}
                  hint="Porcentaje del valor del contrato">
                  <div className="relative">
                    <input type="number" step="0.01" min="0" max="100"
                      {...register('porcentaje_cobertura', {
                        min: { value: 0, message: 'Mínimo 0%.' },
                        max: { value: 100, message: 'Máximo 100%.' },
                      })}
                      placeholder="10.00"
                      className={`ud-input pr-7 ${errors.porcentaje_cobertura ? 'border-estado-vencida' : ''}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-texto text-sm text-ud-gris-claro">%</span>
                  </div>
                </Campo>
                <Campo label="Valor Contrato (COP)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-texto text-sm text-ud-gris-claro">$</span>
                    <input type="number" step="0.01" min="0"
                      {...register('valor_contrato')}
                      placeholder="150000000"
                      className="ud-input pl-7"
                    />
                  </div>
                </Campo>
              </div>

              {/* Referencia contractual */}
              <Campo label="Número de Contrato" hint="Ej: IDEXUD-2025-0001">
                <input {...register('numero_contrato')}
                  placeholder="IDEXUD-2025-0001"
                  className="ud-input" />
              </Campo>

              {/* Aseguradora */}
              <Campo label="Aseguradora" required error={errors.aseguradora_id?.message}>
                <div className="relative">
                  <select
                    {...register('aseguradora_id', { required: 'Seleccione una aseguradora.' })}
                    className={`ud-input appearance-none pr-8 bg-white
                      ${errors.aseguradora_id ? 'border-estado-vencida ring-1 ring-estado-vencida/30' : ''}`}
                    disabled={asegLoad}
                  >
                    <option value="">
                      {asegLoad ? 'Cargando…' : aseguradoras.length === 0 ? 'Sin aseguradoras — use Sembrar demo' : 'Seleccione…'}
                    </option>
                    {aseguradoras.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ud-gris-claro pointer-events-none" />
                </div>
              </Campo>

              {/* Contratista */}
              <Campo label="Contratista" required error={errors.contratista_id?.message}>
                <div className="relative">
                  <select
                    {...register('contratista_id', { required: 'Seleccione un contratista.' })}
                    className={`ud-input appearance-none pr-8 bg-white
                      ${errors.contratista_id ? 'border-estado-vencida ring-1 ring-estado-vencida/30' : ''}`}
                    disabled={contLoad}
                  >
                    <option value="">
                      {contLoad ? 'Cargando…' : contratistas.length === 0 ? 'Sin contratistas — use Sembrar demo' : 'Seleccione…'}
                    </option>
                    {contratistas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_razon_social} — {c.numero_identificacion}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ud-gris-claro pointer-events-none" />
                </div>
              </Campo>

              {/* Corredor de seguros */}
              <Campo label="Corredor de Seguros" error={errors.corredor_id?.message}>
                <div className="relative">
                  <select
                    {...register('corredor_id')}
                    className="ud-input appearance-none pr-8 bg-white"
                    disabled={corrLoad}
                  >
                    <option value="">
                      {corrLoad ? 'Cargando…' : '— Sin corredor asignado —'}
                    </option>
                    {corredores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.empresa} — {c.nombre_corredor}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ud-gris-claro pointer-events-none" />
                </div>
              </Campo>

              {/* Acta de inicio */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox"
                  {...register('requiere_acta_inicio')}
                  className="w-4 h-4 rounded border-gray-300 text-ud-naranja
                             focus:ring-ud-naranja/30 cursor-pointer"
                />
                <span className="font-texto text-sm text-ud-gris
                                 group-hover:text-ud-naranja transition-colors">
                  La cobertura inicia desde el Acta de Inicio del contrato
                </span>
              </label>

              {/* Notas internas */}
              <Campo label="Notas Internas">
                <textarea {...register('notas_internas')} rows={3}
                  placeholder="Observaciones del área jurídica…"
                  className="ud-input resize-none" />
              </Campo>

            </form>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 px-6 py-4
                            border-t border-gray-100 flex-shrink-0 bg-ud-gris-50 z-10">
              <p className="font-texto text-[10px] text-ud-gris-claro">
                <span className="text-estado-vencida">*</span> campos obligatorios
              </p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleCerrar} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" form="form-poliza"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="btn-primary min-w-[140px] justify-center">
                  {isSubmitting ? (
                    <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                  ) : polizaEnEdicion ? (
                    <><FileText size={14} /> Guardar Cambios</>
                  ) : (
                    <><FileText size={14} /> Guardar Borrador</>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Portal al body — evita clipping por z-index o overflow de ancestros
  return createPortal(modalContent, document.body);
}