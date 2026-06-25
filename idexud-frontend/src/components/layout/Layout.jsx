/**
 * src/components/layout/Layout.jsx
 * ==================================
 * Layout principal del sistema Idexud con integración de Roles.
 */

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { polizasApi } from '../../services/api';
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Wallet,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  Users,
  FolderKanban,
} from 'lucide-react';

import { UserRolBadge } from '../../context/AuthContext';

const NAV_PRINCIPAL = [
  { label: 'Inicio', icon: LayoutDashboard, href: '/', exact: true, descripcion: 'Panel de control' },
  { label: 'Pólizas', icon: FileText, href: '/polizas', descripcion: 'Gestión de pólizas' },
  { label: 'Por Vencer', icon: AlertTriangle, href: '/por-vencer', descripcion: 'Alertas', badge: 'alertas' },
  { label: 'Cartera', icon: Wallet, href: '/cartera', descripcion: 'Legalización y Cartera' },
  { label: 'Corredores', icon: Users, href: '/Corredores', descripcion: 'Corredores' },
  { label: 'Aseguradoras', icon: Building2, href: '/aseguradoras', descripcion: 'Aseguradoras' },
  { label: 'Proyectos', icon: FolderKanban, href: '/proyectos', descripcion: 'Proyectos SIEXUD' },
];

const NAV_SECUNDARIO = [
  { label: 'Alertas', icon: Bell, href: '/alertas' },
  { label: 'Configuración', icon: Settings, href: '/configuracion' },
];

function NavItem({ item, collapsed, alertaCount }) {
  const Icon = item.icon;
  const tieneBadge = item.badge === 'alertas' && alertaCount > 0;

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
          isActive ? 'bg-ud-naranja text-white shadow-md' : 'text-gray-400 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <Icon size={18} />
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
      {!collapsed && tieneBadge && (
        <span className="bg-ud-amarillo text-ud-gris-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {alertaCount}
        </span>
      )}
    </NavLink>
  );
}

function Sidebar({ collapsed, onToggle, alertaCount }) {
  return (
    <aside className={`fixed left-0 top-0 h-full z-40 bg-ud-gris-900 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[260px]'}`}>
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-ud-naranja flex items-center justify-center text-white font-bold">IX</div>
        {!collapsed && <span className="text-white font-semibold">Idexud</span>}
      </div>
      <nav className="p-3 space-y-1">
        {NAV_PRINCIPAL.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} alertaCount={alertaCount} />
        ))}
      </nav>
      <div className="absolute bottom-0 w-full p-3 border-t border-white/10">
        <button onClick={onToggle} className="w-full flex justify-center text-gray-500 hover:text-white">
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>
    </aside>
  );
}

function Topbar({ sidebarCollapsed, title, breadcrumb }) {
  return (
    <header
      className="fixed top-0 right-0 z-30 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 transition-all duration-300"
      style={{ left: sidebarCollapsed ? '68px' : '260px' }}
    >
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{breadcrumb}</span>
        <h1 className="text-base font-bold text-gray-800">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <UserRolBadge />
        <div className="h-6 w-px bg-gray-100 mx-2" />
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500 hidden md:block">{new Date().toLocaleDateString('es-CO')}</span>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [alertaCount, setAlertaCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    polizasApi
      .listar({ estado: 'POR_VENCER', por_pagina: 1 })
      .then(({ data }) => setAlertaCount(data.total ?? 0))
      .catch(() => {}); // falla silenciosamente: badge queda en 0
  }, []);

  const paginaActual = [...NAV_PRINCIPAL, ...NAV_SECUNDARIO].find(item => item.href === location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} alertaCount={alertaCount} />
      <Topbar sidebarCollapsed={collapsed} title={paginaActual?.label || 'Idexud'} breadcrumb={paginaActual?.descripcion} />
      <main className={`transition-all duration-300 pt-14 ${collapsed ? 'ml-[68px]' : 'ml-[260px]'}`}>
        <div className="p-6 max-w-screen-xl mx-auto">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
}