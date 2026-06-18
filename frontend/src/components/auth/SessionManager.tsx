import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { storage } from "../../lib/storage";
import { clearCachedAccessToken } from "../../services/api";
import { isBackendDown } from "../../contexts/BackendErrorContext";
import keycloak from "../../lib/keycloak";

/**
 * SessionManager logic for Keycloak SSO.
 * 
 * Moniters the Keycloak token expiration and handles automatic 
 * token refresh. If refresh fails, it redirects to the SSO login page.
 */
export const SessionManager = () => {
    const location = useLocation();
    const warnedRef = useRef<number | null>(null);

    useEffect(() => {
        let logoutTimer: ReturnType<typeof setTimeout> | null = null;
        let warningTimer: ReturnType<typeof setTimeout> | null = null;

        const checkSession = () => {
            // Clear existing timers before setting new ones
            if (logoutTimer) clearTimeout(logoutTimer);
            if (warningTimer) clearTimeout(warningTimer);

            // If not authenticated via Keycloak, nothing to manage here
            if (!keycloak.authenticated || !keycloak.tokenParsed) {
                warnedRef.current = null;
                return;
            }

            const exp = keycloak.tokenParsed.exp;
            if (!exp) return;

            const expirationTime = exp * 1000;
            const currentTime = Date.now();
            
            // Calculate time left with a 10-second buffer to handle minor clock skew
            const timeLeft = (expirationTime - currentTime) + 10000;

            // 1. If token is already expired (even with buffer)
            if (timeLeft <= 0) {
                handleSessionExpired();
                return;
            }

            const warningThreshold = 5 * 60 * 1000; // 5 minutes

            // 2. Set Logout/Expired Timer
            logoutTimer = setTimeout(() => {
                handleSessionExpired();
            }, timeLeft);

            // 3. Set Warning Timer logic with deduplication
            const showWarning = (message: string) => {
                if (warnedRef.current === exp) return;
                
                toast(message, {
                    icon: "⚠️",
                    duration: 6000,
                    style: {
                        border: '1px solid #f59e0b',
                        padding: '16px',
                        color: '#fff',
                        backgroundColor: '#1f2937'
                    },
                });
                warnedRef.current = exp;
            };

            if (timeLeft > warningThreshold) {
                warningTimer = setTimeout(() => {
                    showWarning("Your session will expire in 5 minutes.");
                }, timeLeft - warningThreshold);
            } else if (timeLeft > 1000) {
                showWarning("Your session will expire soon.");
            }
        };

        const handleSessionExpired = () => {
            if (isBackendDown()) {
                console.warn("Session marked as expired, but backend is unreachable. Suppressing redirect.");
                return;
            }

            console.warn("Session expired. Triggering Keycloak login.");
            storage.clear();
            clearCachedAccessToken();
            warnedRef.current = null;
            
            // Redirect to Keycloak login
            keycloak.login({
                redirectUri: window.location.origin + "/login"
            });
            
            toast.error("Session expired. Please login again.");
        };

        // Run check on mount and on location change
        checkSession();

        // Add visibility change listener to re-sync when tab becomes active
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Keycloak public client might have refreshed token in background or another tab
                keycloak.updateToken(30).then(() => {
                    checkSession();
                }).catch(() => {
                    if (!isBackendDown()) {
                        handleSessionExpired();
                    } else {
                        console.warn("Visibility sync failed due to backend outage. Keeping current state.");
                    }
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            if (warningTimer) clearTimeout(warningTimer);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [location.pathname]);

    return null; // Renderless component
};

/**
 * ============================================
 * LEGACY SESSION LOGIC (DISABLED)
 * ============================================
 * 
 * Previously used for the LDAP-based authentication flow with 
 * local JWT tokens. Preserved for reference or future fallback.
 */
/*
const checkSessionLegacy = () => {
    const token = storage.getItem<string>("access_token");
    if (!token) return;
    const payload = parseJwt(token);
    ...
}
*/
