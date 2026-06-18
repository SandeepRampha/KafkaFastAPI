import axios from "axios";
import { triggerGlobalBackendError, isBackendDown } from "../contexts/BackendErrorContext";
import { storage } from "../lib/storage";
import keycloak from "../lib/keycloak";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
    timeout: 30000, // 30 second timeout
});

let isCircuitOpen = false;
let circuitOpenTimeout: number | null = null;

const CIRCUIT_BREAKER_DURATION_MS = 15000;

export const resetCircuit = () => {
    isCircuitOpen = false;
    if (circuitOpenTimeout) {
        clearTimeout(circuitOpenTimeout);
        circuitOpenTimeout = null;
    }
};

/**
 * Legacy token utilities - preserved as no-ops 
 * where possible, or updated to sync with storage loop.
 */
export const setCachedAccessToken = (token: string) => {
    storage.setItem("access_token", token);
};

export const clearCachedAccessToken = () => {
    storage.removeItem("access_token");
};

// Interceptor for the main API
api.interceptors.request.use(
    async (config) => {
        // Circuit Breaker: Block requests if the backend is down
        if (isCircuitOpen && config.url !== "/health") {
            return Promise.reject(new axios.Cancel("Circuit breaker is open. Backend is temporarily unavailable."));
        }

        try {
            if (keycloak.authenticated) {
                // Ensure the token is valid for at least another 30 seconds
                await keycloak.updateToken(30);
                if (keycloak.token) {
                    config.headers.Authorization = `Bearer ${keycloak.token}`;
                    storage.setItem("access_token", keycloak.token);
                }
            }
        } catch (error) {
            console.error("Keycloak token refresh failed", error);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        // Clear error state and circuit breaker on successful response
        triggerGlobalBackendError(false);
        if (isCircuitOpen) {
            resetCircuit();
        }
        return response;
    },
    (error) => {
        const status = error.response ? error.response.status : null;

        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        // 1. Auth Handling (SSO Logout/Redirect)
        if (status === 401) {
            // ONLY redirect if we aren't currently facing a global backend outage.
            // If the backend is down, a 401 might be a false positive from a proxy
            // or we prefer to keep the user on the page until recovery.
            if (!isBackendDown()) {
                // IMPORTANT: Don't redirect to login if Keycloak is still initializing 
                // or if it's not yet certain that the user is unauthenticated.
                // This prevents the "Refresh -> Login" loop.
                if (keycloak.authenticated === false && !window.location.pathname.includes("/login")) {
                    console.warn("401 detected and user is not authenticated. Redirecting to login.");
                    clearCachedAccessToken();
                    window.location.href = "/login?expired=true";
                } else {
                    console.log("401 detected but suppressing redirect (Keycloak may be initializing or already authenticated)");
                }
            } else {
                console.warn("401 detected during backend outage. Suppressing login redirect.");
            }
            return Promise.reject(error);
        }

        const hasDetail = !!error.response?.data?.detail;
        const isCriticalStatus = status === 503 || status === 504 || (status === 500 && !hasDetail);
        const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';

        if (isNetworkError || isCriticalStatus) {
            // 2. Error Classification
            const isTransient = isNetworkError || status === 504; 
            
            // Open the circuit breaker
            isCircuitOpen = true;
            if (circuitOpenTimeout) clearTimeout(circuitOpenTimeout);
            circuitOpenTimeout = window.setTimeout(() => {
                isCircuitOpen = false; 
                circuitOpenTimeout = null;
            }, CIRCUIT_BREAKER_DURATION_MS);

            const details = error.response
                ? `Server infrastructure error (${status}): ${error.config?.url}`
                : `Network connectivity issue (${error.code || 'NO_CODE'}): ${error.config?.url}`;

            // Trigger global error with transient flag
            triggerGlobalBackendError(true, details, { transient: isTransient });
        } else {
            // Business logic errors (400, 403, 404, 500 with details) 
            triggerGlobalBackendError(false);
        }
        
        return Promise.reject(error);
    }
);

export default api;
