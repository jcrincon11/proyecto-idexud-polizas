/**
 * src/components/ui/Pagination.jsx
 * ==================================
 * Control de paginación reutilizable.
 * Muestra: ← Anterior  [1] 2 3 ... 8  Siguiente →
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

function generarPaginas(paginaActual, totalPaginas) {
  if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1);

  const paginas = new Set([1, totalPaginas, paginaActual]);
  if (paginaActual > 1) paginas.add(paginaActual - 1);
  if (paginaActual < totalPaginas) paginas.add(paginaActual + 1);

  const lista = [...paginas].sort((a, b) => a - b);
  const resultado = [];

  for (let i = 0; i < lista.length; i++) {
    if (i > 0 && lista[i] - lista[i - 1] > 1) resultado.push('...');
    resultado.push(lista[i]);
  }
  return resultado;
}

export default function Pagination({ pagina, paginas, total, porPagina, onChange }) {
  if (paginas <= 1) return null;

  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  const items = generarPaginas(pagina, paginas);

  return (
    <div className="flex items-center justify-between px-1 py-3">
      {/* Info */}
      <p className="font-texto text-xs text-ud-gris-claro hidden sm:block">
        Mostrando{' '}
        <span className="font-semibold text-ud-gris">{desde}–{hasta}</span>
        {' '}de{' '}
        <span className="font-semibold text-ud-gris">{total}</span>
        {' '}pólizas
      </p>

      {/* Controles */}
      <div className="flex items-center gap-1">
        {/* Anterior */}
        <button
          onClick={() => onChange(pagina - 1)}
          disabled={pagina === 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                     font-texto font-medium text-ud-gris border border-gray-200
                     hover:bg-ud-gris-50 hover:border-gray-300 disabled:opacity-40
                     disabled:cursor-not-allowed transition-all duration-150"
        >
          <ChevronLeft size={13} />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Páginas numeradas */}
        <div className="flex items-center gap-0.5">
          {items.map((item, idx) =>
            item === '...' ? (
              <span key={`dots-${idx}`}
                    className="px-2 py-1.5 text-xs text-ud-gris-claro font-texto">
                ···
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onChange(item)}
                className={[
                  'w-8 h-8 rounded-lg text-xs font-texto font-medium transition-all duration-150',
                  item === pagina
                    ? 'bg-ud-naranja text-white shadow-sm'
                    : 'text-ud-gris hover:bg-ud-gris-100',
                ].join(' ')}
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* Siguiente */}
        <button
          onClick={() => onChange(pagina + 1)}
          disabled={pagina === paginas}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                     font-texto font-medium text-ud-gris border border-gray-200
                     hover:bg-ud-gris-50 hover:border-gray-300 disabled:opacity-40
                     disabled:cursor-not-allowed transition-all duration-150"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
