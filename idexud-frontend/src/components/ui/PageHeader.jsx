/**
 * PageHeader — encabezado estándar de página para IDEXUD.
 *
 * Props:
 *   title     string   — Título principal (h1)
 *   subtitle  string?  — Subtítulo descriptivo
 *   children  node?    — Slot derecho para botones de acción
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1 leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
