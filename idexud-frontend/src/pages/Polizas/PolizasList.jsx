import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText } from 'lucide-react';
import { usePolizas } from '../../hooks/usePolizas';
import { BadgeEstado, BadgeTipo } from '../../components/ui/Badge';
import SolicitudModal from '../../components/polizas/SolicitudModal';
import PolizaModal from '../../components/polizas/PolizaModal';
import { useAuth } from '../../context/AuthContext';
// IMPORTAMOS EL BOTÓN DEL EXCEL DE CLAUDE
import ExportButton from '../../components/ExportButton';
import { progresoDeEstado } from '../../utils/progress';

function formatCOP(valor) {
  if (valor == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
}

export default function PolizasList() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalPolizaAbierto, setModalPolizaAbierto] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { polizas, loading, filtros, setFiltros, refetch } = usePolizas();

  const aplicarBusqueda = useCallback((valor) => {
    setBusquedaLocal(valor);
    setTimeout(() => { setFiltros({ ...filtros, busqueda: valor || undefined }); }, 350);
  }, [filtros, setFiltros]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="ud-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-auto min-w-0">
            <h2 className="font-titular font-semibold text-ud-gris text-base">Gestión de Pólizas</h2>
          </div>

          <div className="relative w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ud-gris-claro" />
            <input type="text" value={busquedaLocal} onChange={(e) => aplicarBusqueda(e.target.value)} placeholder="Buscar..." className="ud-input pl-8 h-9 text-sm" />
          </div>

          <div className="flex items-center gap-3">
            {/* BOTÓN EXPORTAR A EXCEL (SOLO ADMIN Y DIRECTOR) */}
            {(usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR') && (
              <ExportButton endpoint="http://localhost:8000/api/v1/reportes/excel" />
            )}

            {/* BOTÓN PMO */}
            {(usuario?.rol === 'PMO' || usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR') && (
              <button onClick={() => setModalAbierto(true)} className="btn-primary bg-blue-600 hover:bg-blue-700 h-9">
                <Plus size={15} /> Nueva Solicitud (PMO)
              </button>
            )}

            {/* BOTÓN JURÍDICA */}
            {(usuario?.rol === 'JURIDICA' || usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR') && (
              <button onClick={() => setModalPolizaAbierto(true)} className="btn-primary bg-ud-naranja hover:bg-ud-naranja-dark h-9">
                <FileText size={15} /> Registrar Póliza (Jurídica)
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-ud-gris-50">
                {['Número / Proyecto', 'Tipo', 'Corredor', 'Vigencia Hasta', 'Valor', 'Estado', 'Progreso'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-[10px] font-semibold text-ud-gris-claro uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {polizas?.map((p) => {
                const { porcentaje, colorBarra } = progresoDeEstado(p.estado);
                return (
                  <tr key={p.id} className="group hover:bg-ud-naranja-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/polizas/${p.id}`)}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-sm text-ud-gris group-hover:text-ud-naranja">{p.numero_poliza || 'PENDIENTE'}</p>
                      <p className="text-[10px] text-ud-gris-claro">CC: {p.centro_de_costos || '---'}</p>
                    </td>
                    <td className="px-4 py-3.5"><BadgeTipo tipo={p.tipo} /></td>
                    <td className="px-4 py-3.5 text-sm text-ud-gris truncate max-w-[150px]">{p.contratista?.nombre_razon_social || '---'}</td>
                    <td className="px-4 py-3.5 text-sm text-ud-gris">{p.vigencia_hasta_fmt || '---'}</td>
                    <td className="px-4 py-3.5 font-semibold text-sm text-ud-gris">{formatCOP(p.valor_asegurado)}</td>
                    <td className="px-4 py-3.5"><BadgeEstado estado={p.estado} /></td>
                    <td className="px-4 py-3.5 w-24">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className={`${colorBarra} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${porcentaje}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 w-7 text-right">{porcentaje}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SolicitudModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSubmit={async (data) => {
          const resp = await fetch("http://localhost:8000/api/v1/solicitudes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(errText);
          }
          const responseData = await resp.json();
          refetch(); // Actualiza la tabla en el fondo
          return responseData; // Muestra el ticket
        }}
      />
      <PolizaModal abierto={modalPolizaAbierto} onCerrar={() => setModalPolizaAbierto(false)} onSuccess={refetch} />
    </div>
  );
}