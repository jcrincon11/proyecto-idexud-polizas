/**
 * src/components/polizas/PolizaModal.jsx
 * ========================================
 * Panel lateral deslizable para crear una nueva póliza.
 *
 * Stack de formulario:
 * - React Hook Form (validación client-side + integración nativa con inputs)
 * - Errores de FastAPI (422 con detail[]) mapeados campo a campo en el form
 * - Estados: idle → submitting → success | error
 *
 * Al guardar con éxito: llama onSuccess() que dispara refetch() en PolizasList.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom'; // 🚀 AÑADIDO: El teletransportador
import { useForm } from 'react-hook-form';
import {
  X, FileText, AlertCircle, CheckCircle2,
  Loader2, ChevronDown, RefreshCw,
} from 'lucide-react';
import { polizasApi, seedApi } from '../../services/api';
import { useAseguradoras } from '../../hooks/useEntidades';
import { useContratistas } from '../../hooks/useEntidades';

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
function BannerExito({ numero, onNueva, onCerrar }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-estado-activa-bg flex items-center
                      justify-center mb-5">
        <CheckCircle2 size={32} className="text-estado-activa" />
      </div>
      <h3 className="font-titular font-semibold text-ud-gris text-xl mb-2">
        ¡Póliza creada!
      </h3>
      <p className="font-texto text-sm text-ud-gris-claro mb-1">
        La póliza
      </p>
      <p className="font-titular font-semibold text-ud-naranja text-lg mb-1">
        {numero}
      </p>
      <p className="font-texto text-sm text-ud-gris-claro mb-8">
        fue registrada en estado <strong className="text-ud-gris">Borrador</strong>.
        <br />La tabla se actualizó automáticamente.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={onNueva} className="btn-primary justify-center">
          <FileText size={15} /> Registrar otra póliza
        </button>
        <button onClick={onCerrar} className="btn-secondary justify-center">
          Volver a la tabla
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PolizaModal({ abierto, onCerrar, onSuccess }) {
  const [exito, setExito] = useState(null);   // número de póliza creada
  const [errorGlobal, setErrorGlobal] = useState(null);   // error de red / 500
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState(null);

  const { aseguradoras, loading: asegLoad } = useAseguradoras();
  const { contratistas, loading: contLoad } = useContratistas();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
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
      requiere_acta_inicio: false,
      notas_internas: '',
    },
  });

  const vigenciaDesde = watch('vigencia_desde');

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const h = (e) => { if (e.key === 'Escape') handleCerrar(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [abierto]);

  // Reset al abrir
  useEffect(() => {
    if (abierto) { reset(); setExito(null); setErrorGlobal(null); setSeedMsg(null); }
  }, [abierto]);

  const handleCerrar = () => { onCerrar(); };

  const handleNueva = () => { reset(); setExito(null); setErrorGlobal(null); };

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

    payload.aseguradora_id = parseInt(payload.aseguradora_id, 10);
    payload.contratista_id = parseInt(payload.contratista_id, 10);
    if (payload.valor_asegurado) payload.valor_asegurado = payload.valor_asegurado.toString();
    if (payload.valor_prima) payload.valor_prima = payload.valor_prima.toString();
    if (payload.valor_contrato) payload.valor_contrato = payload.valor_contrato.toString();
    if (payload.porcentaje_cobertura) payload.porcentaje_cobertura = payload.porcentaje_cobertura.toString();
    payload.requiere_acta_inicio = !!payload.requiere_acta_inicio;

    try {
      const { data } = await polizasApi.crear(payload);
      setExito(data.numero_poliza);
      onSuccess?.();            // ← dispara refetch() en PolizasList
    } catch (err) {
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

  // 🚀 LA MAGIA: Guardamos TODO el render en una variable
  const modalContent = (
    <>
      {/* Overlay: z-[99999] garantiza que esté sobre todo */}
      <div className="fixed inset-0 bg-black/40 z-[99999] animate-fade-in"
        onClick={handleCerrar} aria-hidden="true" />

      {/* Panel Lateral: z-[99999] garantiza que esté sobre todo */}
      <div role="dialog" aria-modal="true" aria-labelledby="modal-titulo"
        className="fixed inset-y-0 right-0 z-[99999] w-full max-w-[520px] bg-white
                      shadow-2xl flex flex-col animate-slide-in overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ud-naranja-50 flex items-center
                            justify-center flex-shrink-0">
              <FileText size={16} className="text-ud-naranja" />
            </div>
            <div>
              <h2 id="modal-titulo"
                className="font-titular font-semibold text-ud-gris text-[15px]">
                Nueva Póliza
              </h2>
              <p className="font-texto text-[10px] text-ud-gris-claro">
                Se creará en estado Borrador → POST /api/v1/polizas/
              </p>
            </div>
          </div>
          <button onClick={handleCerrar}
            className="p-1.5 rounded-lg text-ud-gris-claro hover:text-ud-gris
                             hover:bg-ud-gris-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Pantalla de éxito ─────────────────────────────────────────── */}
        {exito ? (
          <BannerExito numero={exito} onNueva={handleNueva} onCerrar={handleCerrar} />
        ) : (
          <>
            {/* ── Seed de demo ──────────────────────────────────────────── */}
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
                    validate: (v) => !/^\d+$/.test(v) || 'Debe incluir letras, no solo números.',
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
                        return v > vigenciaDesde || '"Hasta" debe ser posterior a "Desde".';
                      },
                    })}
                    min={vigenciaDesde || undefined}
                    className={`ud-input ${errors.vigencia_hasta ? 'border-estado-vencida ring-1 ring-estado-vencida/30' : ''}`}
                  />
                </Campo>
              </div>

              {/* Valores económicos */}
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Valor Asegurado (COP)" required
                  error={errors.valor_asegurado?.message}
                  hint="Ej: 15000000">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-texto text-sm text-ud-gris-claro">$</span>
                    <input type="number" step="0.01" min="1000"
                      {...register('valor_asegurado', {
                        required: 'El valor asegurado es obligatorio.',
                        min: { value: 1000, message: 'Mínimo $ 1.000 COP.' },
                      })}
                      placeholder="15000000"
                      className={`ud-input pl-7 ${errors.valor_asegurado ? 'border-estado-vencida ring-1 ring-estado-vencida/30' : ''}`}
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
                <button type="submit" form="form-poliza" disabled={isSubmitting}
                  className="btn-primary min-w-[140px] justify-center">
                  {isSubmitting ? (
                    <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                  ) : (
                    <><FileText size={14} /> Guardar Borrador</>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  // 🚀 EL PORTAL: Renderiza el modal fuera de tu app, directamente en el Body
  return createPortal(modalContent, document.body);
}