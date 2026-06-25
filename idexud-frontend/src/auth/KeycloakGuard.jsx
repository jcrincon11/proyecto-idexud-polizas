/**
 * src/auth/KeycloakGuard.jsx
 * ===========================
 * Guarda de autenticación Keycloak.
 *
 * - Si VITE_KEYCLOAK_ENABLED !== 'true': pasa directo (modo desarrollo/demo).
 * - Si VITE_KEYCLOAK_ENABLED === 'true':
 *     1. Inicializa el cliente Keycloak con `onLoad: 'login-required'`.
 *        Keycloak redirige automáticamente al login si no hay sesión activa.
 *     2. Guarda el Bearer token en localStorage['idexud_token'] para que
 *        api.js lo adjunte en cada request (interceptor ya configurado).
 *     3. Programa un intervalo de refresco automático del token (cada 30 s,
 *        renueva si vence en < 60 s).
 *
 * Rutas: No toca la estructura de rutas. El guard envuelve toda la app antes
 * del BrowserRouter, así cualquier ruta no autenticada es interceptada.
 */

import { useEffect, useState } from 'react';
import keycloak from './keycloak';

const KEYCLOAK_ENABLED = import.meta.env.VITE_KEYCLOAK_ENABLED === 'true';

// ── Pantalla de carga mientras Keycloak inicializa ────────────────────────────
function PantallaCarga() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <div className="w-12 h-12 border-4 border-[#CC6628] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 font-medium">Verificando sesión institucional…</p>
      <p className="text-xs text-gray-300">Universidad Distrital Francisco José de Caldas</p>
    </div>
  );
}

// ── Pantalla de error de autenticación ───────────────────────────────────────
function PantallaError({ onReintentar }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
        <span className="text-red-600 text-xl">⚠</span>
      </div>
      <p className="text-sm font-semibold text-red-700">No se pudo conectar con el servidor de autenticación</p>
      <p className="text-xs text-gray-400 max-w-xs text-center">
        Verifique que el servidor Keycloak esté disponible y que las variables
        VITE_KEYCLOAK_* en .env.local sean correctas.
      </p>
      <button
        onClick={onReintentar}
        className="px-4 py-2 text-sm font-semibold bg-[#CC6628] text-white rounded-lg
                   hover:bg-[#b05820] transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}

// ── Guard principal ───────────────────────────────────────────────────────────
export default function KeycloakGuard({ children }) {
  // Si Keycloak está desactivado, renderizar directo sin inicializar
  if (!KEYCLOAK_ENABLED) return children;

  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'autenticado' | 'error'

  const inicializar = () => {
    setEstado('cargando');

    keycloak
      .init({
        onLoad: 'login-required',   // redirige al login si no hay sesión
        checkLoginIframe: false,    // evita problemas con cookies SameSite en dev
        pkceMethod: 'S256',         // PKCE obligatorio en Keycloak 18+
      })
      .then((autenticado) => {
        if (!autenticado) {
          // onLoad: 'login-required' garantiza que si llega aquí es porque hay sesión,
          // pero lo manejamos por si acaso.
          keycloak.login();
          return;
        }

        // Guardar token para el interceptor de api.js
        localStorage.setItem('idexud_token', keycloak.token ?? '');

        // Refrescar token automáticamente cada 30 s si vence en < 60 s
        const intervalo = setInterval(() => {
          keycloak.updateToken(60)
            .then((refrescado) => {
              if (refrescado) {
                localStorage.setItem('idexud_token', keycloak.token ?? '');
              }
            })
            .catch(() => {
              console.warn('[Keycloak] Token expirado — cerrando sesión.');
              clearInterval(intervalo);
              localStorage.removeItem('idexud_token');
              keycloak.logout();
            });
        }, 30_000);

        // Limpiar intervalo cuando el componente se desmonte
        keycloak.onAuthLogout = () => {
          clearInterval(intervalo);
          localStorage.removeItem('idexud_token');
        };

        setEstado('autenticado');
      })
      .catch((err) => {
        console.error('[Keycloak] Error al inicializar:', err);
        setEstado('error');
      });
  };

  useEffect(() => {
    inicializar();
  }, []);

  if (estado === 'cargando')    return <PantallaCarga />;
  if (estado === 'error')       return <PantallaError onReintentar={inicializar} />;
  return children;
}

// ── Helpers exportados para usar en componentes ───────────────────────────────
export const cerrarSesion = () => {
  localStorage.removeItem('idexud_token');
  if (KEYCLOAK_ENABLED) keycloak.logout();
};

export const obtenerUsuarioKeycloak = () => {
  if (!KEYCLOAK_ENABLED || !keycloak.tokenParsed) return null;
  return {
    email:  keycloak.tokenParsed.email        ?? keycloak.tokenParsed.sub,
    nombre: keycloak.tokenParsed.name         ?? keycloak.tokenParsed.preferred_username,
    roles:  keycloak.tokenParsed.realm_access?.roles ?? [],
  };
};
