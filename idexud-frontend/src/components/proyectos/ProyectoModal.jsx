import { useEffect } from 'react';
import {
  X, ExternalLink, Building2, Calendar, DollarSign,
  MapPin, Hash, FolderKanban, Mail, FileCheck,
} from 'lucide-react';

// ── Utilidades ────────────────────────────────────────────────────────────────

function formatCOP(v) {
  if (v == null) return null;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(v);
}

function formatFecha(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function formatFechaHora(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const ESTADO_BADGE = {
  'EN EJECUCIÓN': 'bg-green-100 text-green-700',
  'SUSCRITO':     'bg-blue-100 text-blue-700',
  'TERMINADO':    'bg-gray-100 text-gray-600',
  'SUSPENDIDO':   'bg-yellow-100 text-yellow-700',
  'LIQUIDADO':    'bg-purple-100 text-purple-700',
};

// ── Primitivas ────────────────────────────────────────────────────────────────

function Campo({ label, valor, mono = false, full = false, resaltado = false }) {
  if (valor == null || valor === '') return null;
  if (resaltado) {
    return (
      <div className={`bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 ${full ? 'col-span-2' : ''}`}>
        <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-800">{valor}</p>
      </div>
    );
  }
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-gray-700 leading-snug ${mono ? 'font-mono' : ''}`}>{valor}</p>
    </div>
  );
}

function Separador({ icono: Icon, titulo }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <Icon size={13} className="text-[#CC6628] flex-shrink-0" />
      <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider">{titulo}</p>
      <div className="flex-1 h-px bg-orange-100" />
    </div>
  );
}

function EnlaceExterno({ href, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-[#CC6628] hover:text-[#a0511f] hover:underline font-medium transition-colors break-all"
    >
      <ExternalLink size={13} className="flex-shrink-0" />
      {label}
    </a>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ProyectoModal({ isOpen, onClose, proyecto }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !proyecto) return null;

  const badgeCls = ESTADO_BADGE[proyecto.estado] ?? 'bg-gray-100 text-gray-500';

  const prorrogaTexto = proyecto.prorrogado
    ? `Sí — ${proyecto.num_prorrogas} prórroga${proyecto.num_prorrogas !== 1 ? 's' : ''}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Contenedor — patrón idéntico a SolicitudDetailModal */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── CABECERA ──────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#CC6628] to-[#a0511f] px-6 pt-5 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <FolderKanban size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">
                  Ficha de Proyecto SIEXUD
                </p>
                <p className="text-white font-bold text-sm leading-snug mt-0.5 line-clamp-2">
                  {proyecto.nombre}
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

          {/* Badge de código contable — igual al código comprobante de SolicitudDetailModal */}
          <div className="mt-4 bg-white/10 border border-white/25 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-white/60 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">
                Código Contable / Centro de Costos
              </p>
              <p className="font-mono text-white font-bold text-2xl tracking-[0.10em]">
                {proyecto.codigo_contable ?? `#${proyecto.numero_interno}`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeCls}`}>
                {proyecto.estado ?? '—'}
              </span>
              {proyecto.anio && (
                <span className="text-[10px] font-semibold text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                  {proyecto.anio}
                </span>
              )}
              {proyecto.prorrogado && (
                <span className="text-[10px] font-semibold text-orange-200 bg-orange-900/30 px-2 py-0.5 rounded-full">
                  +{proyecto.num_prorrogas}P
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── CUERPO (scrollable) ───────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh]">

          {/* Valor vigente resaltado */}
          {proyecto.valor_vigente != null && (
            <Campo label="Valor Vigente del Contrato" valor={formatCOP(proyecto.valor_vigente)} resaltado full />
          )}

          {/* ── Identificación ───────────────────────────────────────── */}
          <Separador icono={Hash} titulo="Identificación" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Campo label="N° Interno"          valor={`#${proyecto.numero_interno}`} mono />
            <Campo label="N° Externo"          valor={proyecto.numero_externo}       mono />
            <Campo label="Código Contable"     valor={proyecto.codigo_contable}      mono />
            <Campo label="Año"                 valor={proyecto.anio} />
            <Campo label="Tipo de Financiación" valor={proyecto.tipo_financiacion}   full />
          </div>

          {/* ── Objeto del contrato ──────────────────────────────────── */}
          {proyecto.objeto && (
            <>
              <Separador icono={FolderKanban} titulo="Objeto del Contrato" />
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                {proyecto.objeto}
              </p>
            </>
          )}

          {/* ── Entidades ────────────────────────────────────────────── */}
          <Separador icono={Building2} titulo="Entidades" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Campo label="Entidad Contratante"   valor={proyecto.entidad_contratante}   full />
            <Campo label="Dependencia Ejecutora" valor={proyecto.dependencia_ejecutora} full />
            <Campo label="Supervisor"            valor={proyecto.supervisor} />
            <Campo label="Correo de Contacto"    valor={proyecto.correo_principal} />
          </div>
          {/* Correo como enlace mailto */}
          {proyecto.correo_principal && (
            <a
              href={`mailto:${proyecto.correo_principal}`}
              className="inline-flex items-center gap-1.5 text-sm text-[#CC6628] hover:text-[#a0511f] hover:underline font-medium transition-colors"
            >
              <Mail size={13} />
              {proyecto.correo_principal}
            </a>
          )}

          {/* ── Fechas y plazos ──────────────────────────────────────── */}
          <Separador icono={Calendar} titulo="Fechas y Plazos" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Campo label="Fecha Suscripción"   valor={formatFecha(proyecto.fecha_suscripcion)} />
            <Campo label="Fecha Inicio"        valor={formatFecha(proyecto.fecha_inicio)} />
            <Campo label="Fecha Fin Original"  valor={formatFecha(proyecto.fecha_fin_original)} />
            <Campo label="Fecha Fin Vigente"   valor={formatFecha(proyecto.fecha_fin_vigente)} />
            <Campo label="Prorrogado"          valor={prorrogaTexto} />
            {proyecto.num_modificaciones > 0 && (
              <Campo label="Modificaciones"    valor={proyecto.num_modificaciones} />
            )}
          </div>

          {/* ── Desglose económico ───────────────────────────────────── */}
          <Separador icono={DollarSign} titulo="Desglose Económico" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Campo label="Valor Original"          valor={formatCOP(proyecto.valor_original)} />
            <Campo label="Total Adicionado"        valor={formatCOP(proyecto.total_adicionado)} />
            <Campo label="Aporte Entidad"          valor={formatCOP(proyecto.aporte_entidad)} />
            <Campo label="Aporte Universidad"      valor={formatCOP(proyecto.aporte_universidad)} />
            <Campo label="Beneficio Institucional" valor={formatCOP(proyecto.beneficio_institucional)} />
            <Campo label="% Beneficio"             valor={proyecto.pct_beneficio != null ? `${proyecto.pct_beneficio} %` : null} />
          </div>

          {/* ── Cobertura geográfica ─────────────────────────────────── */}
          {(proyecto.region_impactada || proyecto.region_codigo) && (
            <>
              <Separador icono={MapPin} titulo="Cobertura Geográfica" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Campo label="Región Impactada" valor={proyecto.region_impactada} />
                <Campo label="Código Región"    valor={proyecto.region_codigo} mono />
              </div>
            </>
          )}

          {/* ── Soporte documental ───────────────────────────────────── */}
          {(proyecto.enlace_secop || proyecto.acto_administrativo) && (
            <>
              <Separador icono={FileCheck} titulo="Soporte Documental" />
              <div className="space-y-3">
                {proyecto.enlace_secop && (
                  <div>
                    <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-1">
                      Enlace SECOP / NextCloud
                    </p>
                    <EnlaceExterno href={proyecto.enlace_secop} label="Ver documento en SECOP" />
                  </div>
                )}
                {proyecto.acto_administrativo && (
                  <div>
                    <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-1">
                      Acto Administrativo
                    </p>
                    {proyecto.acto_administrativo.startsWith('http') ? (
                      <EnlaceExterno href={proyecto.acto_administrativo} label={proyecto.acto_administrativo} />
                    ) : (
                      <p className="text-sm text-gray-700 font-mono">{proyecto.acto_administrativo}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Metadatos de auditoría ───────────────────────────────── */}
          {(proyecto.created_at || proyecto.updated_at) && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-0.5">
                  Fecha Sincronización
                </p>
                <p className="text-xs text-gray-500">{formatFechaHora(proyecto.created_at) ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#CC6628] uppercase tracking-wider mb-0.5">
                  Última Actualización
                </p>
                <p className="text-xs text-gray-500">{formatFechaHora(proyecto.updated_at) ?? '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── PIE ────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">Fuente: OFEX — Universidad Distrital</span>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
