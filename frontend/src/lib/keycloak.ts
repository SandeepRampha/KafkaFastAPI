/**
 * Keycloak JS Instance Configuration
 * 
 * Initializes the Keycloak client for the React frontend.
 * Client ID: kafka-ui-frontend (public client, no secret)
 * 
 * Environment variables:
 *   VITE_KEYCLOAK_URL - Keycloak server URL (default: http://localhost:8080)
 *   VITE_KEYCLOAK_REALM - Keycloak realm (default: multi-tenant-app)
 *   VITE_KEYCLOAK_CLIENT_ID - Client ID (default: kafka-ui-frontend)
 */

import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || "/keycloak",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "multi-tenant-app",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "kafka-ui-frontend",
});

export default keycloak;
