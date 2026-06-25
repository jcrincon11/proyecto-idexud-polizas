/**
 * src/services/api.js
 * ====================
 * Instancia central de Axios configurada para el backend FastAPI (puerto 8000).
 *
 * Características:
 *   - baseURL leída desde variable de entorno VITE_API_URL (con fallback a localhost).
 *   - Interceptor de REQUEST: adjunta el token JWT si existe en localStorage.
 *   - Interceptor de RESPONSE: normaliza errores en español con mensaje descriptivo.
 *   - Timeout de 15 segundos para evitar cuelgues silenciosos.
 *
 * Uso en un componente o servicio:
 *   import api from '@/services/api';
 *   const { data } = await api.get('/polizas/', { params: { estado: 'ACTIVA' } });
 */

import axios from 'axios';

// ── Instancia base ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Interceptor de REQUEST: adjuntar credenciales ────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('idexud_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }

    // ── DEBUG (remover en producción) ─────────────────────────────────────────
    console.log(
      `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      '\n  X-API-Key presente:', !!config.headers['X-API-Key'],
      '\n  VITE_API_KEY definida:', !!import.meta.env.VITE_API_KEY,
      '\n  headers completos:', JSON.stringify(config.headers),
    );
    // ─────────────────────────────────────────────────────────────────────────

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Interceptor de RESPONSE: normalizar errores ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    // Mensajes en español según el código HTTP
    const mensajes = {
      400: 'Solicitud inválida. Revise los datos enviados.',
      401: 'Su sesión ha expirado. Por favor inicie sesión nuevamente.',
      403: 'No tiene permisos para realizar esta acción.',
      404: 'El recurso solicitado no fue encontrado.',
      409: detail ?? 'Ya existe un registro con estos datos.',
      422: detail ?? 'Los datos enviados no son válidos.',
      500: 'Error interno del servidor. Contacte al administrador.',
      503: 'El servidor no está disponible. Intente más tarde.',
    };

    // Enriquecer el error con mensaje legible
    error.mensajeUsuario =
      (typeof detail === 'string' ? detail : null)
      ?? mensajes[status]
      ?? `Error inesperado (código ${status ?? 'desconocido'}).`;

    // Redirigir al login si el token expiró
    if (status === 401) {
      localStorage.removeItem('idexud_token');
      // window.location.href = '/login';  // Descomentar al implementar auth
    }

    return Promise.reject(error);
  },
);

export default api;

// ── Helpers tipados por recurso ───────────────────────────────────────────────
// Importar estos en los componentes en lugar de usar api directamente,
// para centralizar las rutas y facilitar refactors futuros.

export const polizasApi = {
  listar: (params) => api.get('/polizas/', { params }),
  obtener: (id) => api.get(`/polizas/${id}`),
  crear: (body) => api.post('/polizas/', body),
  actualizar: (id, body) => api.put(`/polizas/${id}`, body),
  eliminar: (id) => api.delete(`/polizas/${id}`),
  anular: (id, motivo) => api.delete(`/polizas/${id}`, { params: { motivo } }),
  stats: () => api.get('/polizas/dashboard/stats'),
};

export const schedulerApi = {
  estado: () => api.get('/health/scheduler', { baseURL: 'http://localhost:8000' }),
  ejecutar: () => api.post('/admin/scheduler/ejecutar-alertas', null, {
    baseURL: 'http://localhost:8000',
  }),
};

export const aseguradorasApi = {
  listar: () => api.get('/aseguradoras'),
  crear: (body) => api.post('/aseguradoras/', body),
  eliminar: (id) => api.delete(`/aseguradoras/${id}`),
};

export const contratistasApi = {
  listar: () => api.get('/contratistas/'),
  crear: (body) => api.post('/contratistas/', body),
};

export const seedApi = {
  demo: () => api.post('/seed/demo'),
};
export const checklistApi = {
  obtener:    (polizaId) => api.get(`/polizas/${polizaId}/checklist`),
  actualizar: (polizaId, cambios) => api.patch(`/polizas/${polizaId}/checklist`, cambios),
};

export const carteraApi = {
  listar:     (params)      => api.get('/cartera/', { params }),
  resumen:    ()            => api.get('/cartera/resumen'),
  obtener:    (id)          => api.get(`/cartera/${id}`),
  actualizar: (id, cambios) => api.patch(`/cartera/${id}`, cambios),
};

export const corredoresApi = {
  listar: (params) => api.get('/corredores', { params }),
  crear: (body) => api.post('/corredores', body),
};

export const solicitudesApi = {
  listar: () => api.get('/solicitudes'),
  crear: (body) => api.post('/solicitudes', body),
  obtener: (id) => api.get(`/solicitudes/${id}`),
};

// TODO: Conectar motor de alertas — implementar cuando el ingeniero de TI
//       configure el scheduler y el servicio SMTP/Twilio (ver notificaciones_interface.py).
export const alertasApi = {
  listar: (params) => api.get('/alertas/', { params }),
  stats:  ()       => api.get('/alertas/stats'),
};

export const siexudApi = {
  sincronizar: () => api.post('/sincronizar'),
};

export const proyectosApi = {
  listar: (params) => api.get('/proyectos', { params }),
  opciones: (q) => api.get('/proyectos/opciones', { params: q ? { q } : {} }),
};