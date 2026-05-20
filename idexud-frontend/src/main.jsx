import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import Layout from './components/layout/Layout.jsx'
import PolizasList from './pages/Polizas/PolizasList.jsx'
import PolizaDetail from './pages/Polizas/PolizaDetail.jsx'
import AseguradorasList from './pages/Aseguradoras/AseguradorasList.jsx'
import CorredoresList from './pages/Corredores/CorredoresList.jsx'
import CarteraList from './pages/Cartera/CarteraList.jsx'
import AlertasPage from './pages/Alertas/AlertasPage.jsx'
import PorVencerPage from './pages/PorVencer/PorVencerPage.jsx'
import { AuthProvider } from './context/AuthContext'

const Placeholder = ({ nombre }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <div className="w-12 h-12 rounded-xl bg-ud-naranja/10 flex items-center justify-center">
      <span className="text-ud-naranja text-xl">🚧</span>
    </div>
    <h2 className="font-titular text-ud-gris font-semibold text-lg">{nombre}</h2>
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Toaster
        position="top-right"
        richColors
        expand={false}
        toastOptions={{ duration: 3000 }}
      />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout alertaCount={3} />}>
            <Route path="/" element={<PolizasList />} />
            <Route path="/polizas" element={<PolizasList />} />
            <Route path="/polizas/:id" element={<PolizaDetail />} />
            <Route path="/por-vencer" element={<PorVencerPage />} />
            
            {/* RUTA DE CARTERA CONECTADA */}
            <Route path="/cartera" element={<CarteraList />} />
            
            <Route path="/corredores" element={<CorredoresList />} />
            <Route path="/aseguradoras" element={<AseguradorasList />} />
            <Route path="/alertas" element={<AlertasPage />} />
            <Route path="/configuracion" element={<Placeholder nombre="Configuración" />} />
            <Route path="*" element={<Navigate to="/polizas" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)