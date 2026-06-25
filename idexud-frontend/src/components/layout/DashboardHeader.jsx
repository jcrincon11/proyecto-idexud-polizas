/**
 * DashboardHeader — cabecera ejecutiva oscura para las páginas principales.
 *
 * Replica 1:1 el estilo de PorVencerPage: degradado oscuro, círculos decorativos,
 * breadcrumb coloreado, tipografía Lora y chips de métricas en la fila inferior.
 *
 * Props:
 *   title      string               — Título principal (h1)
 *   subtitle   string               — Descripción corta
 *   breadcrumb string               — Ruta superior (ej: "IDEXUD · Gestión de Pólizas")
 *   accent     string               — Color del breadcrumb y círculo 1 (default #CC6628)
 *   accent2    string               — Color del círculo 2              (default = accent)
 *   stats      {label,value,desc}[] — Chips de métricas en la fila inferior
 *   children   node                 — Slot derecho (botones / badges)
 */
export default function DashboardHeader({
  title,
  subtitle,
  breadcrumb,
  accent  = '#CC6628',
  accent2,
  stats   = [],
  children,
}) {
  const a2 = accent2 ?? accent;

  return (
    <div
      className="rounded-2xl px-8 py-7 text-white overflow-hidden relative mb-8"
      style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2E2E2E 60%, #1a2540 100%)' }}
    >
      {/* ── Círculos decorativos ── */}
      <div
        className="absolute right-0 top-0 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: accent, opacity: 0.06, transform: 'translate(30%, -30%)' }}
      />
      <div
        className="absolute right-20 bottom-0 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: a2, opacity: 0.06, transform: 'translateY(50%)' }}
      />

      <div className="relative z-10">
        {/* ── Fila superior: título + acciones ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {breadcrumb && (
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: accent }}
                >
                  {breadcrumb}
                </span>
              </div>
            )}
            <h1 className="text-3xl font-bold font-['Lora',serif] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1.5 max-w-md leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {children && (
            <div className="flex items-center flex-wrap gap-3 flex-shrink-0">
              {children}
            </div>
          )}
        </div>

        {/* ── Fila de métricas (solo si hay stats) ── */}
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-white/10">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 min-w-[100px]"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {s.label}
                </p>
                {s.value != null ? (
                  <p className="text-2xl font-bold text-white leading-none">{s.value}</p>
                ) : (
                  <div className="w-10 h-7 bg-white/10 rounded animate-pulse" />
                )}
                {s.desc && (
                  <p className="text-[11px] text-gray-500 mt-1 leading-tight">{s.desc}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
