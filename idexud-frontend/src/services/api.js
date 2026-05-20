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

// ── Interceptor de REQUEST: adjuntar JWT ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('idexud_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
  actualizar: (id, body) => api.patch(`/polizas/${id}`, body),
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
  listar: () => api.get('/aseguradoras/'),
  crear: (body) => api.post('/aseguradoras/', body),
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
  // GET /cartera/?estado=PAGADO&busqueda=...
  listar:     (params)      => api.get('/cartera/', { params }),
  // GET /cartera/:id
  obtener:    (id)          => api.get(`/cartera/${id}`),
  // PATCH /cartera/:id  — solo los campos que cambian (estado, OP, fecha, enlace)
  actualizar: (id, cambios) => api.patch(`/cartera/${id}`, cambios),
};