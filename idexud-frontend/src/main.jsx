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
import DashboardGeneral from './pages/Dashboard/DashboardGeneral.jsx'
import ProyectosList from './pages/Proyectos/ProyectosList.jsx'
import { AuthProvider } from './context/AuthContext'
import KeycloakGuard from './auth/KeycloakGuard.jsx'

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
    {/*
      KeycloakGuard: intercepta ANTES del router.
        - VITE_KEYCLOAK_ENABLED=false (o ausente) → pasa directo, app funciona sin Keycloak.
        - VITE_KEYCLOAK_ENABLED=true              → redirige al login de Keycloak si no hay sesión.
      AuthProvider: gestiona roles y permisos internos (independiente de Keycloak).
    */}
    <KeycloakGuard>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
          expand={false}
          toastOptions={{ duration: 3000 }}
        />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardGeneral />} />
              <Route path="/polizas" element={<PolizasList />} />
              <Route path="/polizas/:id" element={<PolizaDetail />} />
              <Route path="/por-vencer" element={<PorVencerPage />} />

              {/* RUTA DE CARTERA CONECTADA */}
              <Route path="/cartera" element={<CarteraList />} />

              <Route path="/corredores" element={<CorredoresList />} />
              <Route path="/aseguradoras" element={<AseguradorasList />} />
              <Route path="/proyectos" element={<ProyectosList />} />
              <Route path="/alertas" element={<AlertasPage />} />
              <Route path="/configuracion" element={<Placeholder nombre="Configuración" />} />
              <Route path="*" element={<Navigate to="/polizas" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </KeycloakGuard>
  </StrictMode>,
)