import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Layout from './components/layout/Layout.jsx'
import PolizasList from './pages/Polizas/PolizasList.jsx'
import PolizaDetail from './pages/Polizas/PolizaDetail.jsx'
import { AuthProvider } from './context/AuthContext'

// 👇 IMPORTAMOS LAS NUEVAS PANTALLAS ESPECTACULARES
import AseguradorasList from './pages/Aseguradoras/AseguradorasList.jsx'
import CorredoresList from './pages/Corredores/CorredoresList.jsx'

const Placeholder = ({ nombre }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <div className="w-12 h-12 rounded-xl bg-ud-naranja/10 flex items-center justify-center">
      <span className="text-ud-naranja text-xl">🚧</span>
    </div>
    <h2 className="font-titular text-ud-gris font-semibold text-lg">{nombre}</h2>
    <p className="font-texto text-ud-gris-claro text-sm">Esta sección se implementa en la siguiente fase</p>
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout alertaCount={3} />}>
            <Route path="/" element={<PolizasList />} />
            <Route path="/polizas" element={<PolizasList />} />
            <Route path="/polizas/:id" element={<PolizaDetail />} />
            <Route path="/por-vencer" element={<Placeholder nombre="Pólizas por Vencer" />} />
            <Route path="/cartera" element={<Placeholder nombre="Cartera y Legalización" />} />

            {/* 👇 CONECTAMOS LAS RUTAS REALES */}
            <Route path="/corredores" element={<CorredoresList />} />
            <Route path="/aseguradoras" element={<AseguradorasList />} />

            <Route path="/alertas" element={<Placeholder nombre="Historial de Alertas" />} />
            <Route path="/configuracion" element={<Placeholder nombre="Configuración" />} />
            <Route path="*" element={<Navigate to="/polizas" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)