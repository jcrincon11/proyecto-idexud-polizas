/**
 * src/auth/keycloak.js
 * =====================
 * Instancia singleton de Keycloak.
 *
 * Configurar estas variables en .env.local:
 *   VITE_KEYCLOAK_URL       URL base del servidor  (ej: http://keycloak.udistrital.edu.co)
 *   VITE_KEYCLOAK_REALM     Nombre del realm        (ej: idexud)
 *   VITE_KEYCLOAK_CLIENT_ID ID del cliente público  (ej: idexud-frontend)
 *
 * VITE_KEYCLOAK_ENABLED=true activa el guard; false (o ausente) lo bypasea
 * para que el entorno de desarrollo funcione sin servidor Keycloak levantado.
 */

import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url:      import.meta.env.VITE_KEYCLOAK_URL       ?? 'http://localhost:8080',
  realm:    import.meta.env.VITE_KEYCLOAK_REALM     ?? 'idexud',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'idexud-frontend',
});

export default keycloak;
