import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { storage } from "../lib/storage";
import { setCachedAccessToken, clearCachedAccessToken } from "../services/api";
import { isBackendDown } from "./BackendErrorContext";
import keycloak from "../lib/keycloak";

export type Role = "admin" | "user" | "data_steward";

interface User {
  username: string;
  role: Role;
  tenant: string;
  groups: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loginWithKeycloak: () => void;
  logout: () => void;
  isLoading: boolean;
  keycloakReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Map Keycloak realm_access.roles to application Role type.
 * Priority: ADMIN > DATA_STEWARD > USER (default)
 */
function mapKeycloakRole(kcRoles: string[]): Role {
  const upperRoles = kcRoles.map((r) => r.toUpperCase());
  if (upperRoles.includes("ADMIN")) return "admin";
  if (upperRoles.includes("DATA_STEWARD")) return "data_steward";
  return "user";
}

/**
 * Build groups array from role for backward-compat with existing sidebar/nav code.
 */
function roleToGroups(role: Role): string[] {
  if (role === "admin") return ["admins"];
  if (role === "data_steward") return ["stewards"];
  return ["users"];
}

/**
 * Extract user info from Keycloak token claims.
 */
function extractUserFromToken(): User | null {
  // Profile info can come from either, but ID token is usually better for email/name
  const profile = (keycloak.idTokenParsed || keycloak.tokenParsed) as Record<string, unknown>;
  // ROLES must come from the Access Token (tokenParsed)
  const rolesSource = (keycloak.tokenParsed) as Record<string, unknown>;

  if (!profile || !rolesSource) return null;

  const username =
    (profile.preferred_username as string) ||
    (profile.email as string) ||
    (profile.sub as string);

  // Extract roles specifically from the Access Token
  const realmRoles = (rolesSource.realm_access as { roles?: string[] })?.roles || [];
  const resourceAccess = (rolesSource.resource_access as Record<string, { roles?: string[] }>) || {};
  const clientRoles = resourceAccess[keycloak.clientId || ""]?.roles || [];
  const allRoles = [...realmRoles, ...clientRoles];

  const role = mapKeycloakRole(allRoles);
  const tenant = (rolesSource.tenant as string) || (profile.tenant as string) || "default";

  return {
    username: username || "unknown",
    role,
    tenant,
    groups: roleToGroups(role),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [keycloakReady, setKeycloakReady] = useState(false);
  const initStarted = useRef(false);

  // Initialize Keycloak on mount
  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    const initKeycloak = async () => {
      try {
        const isLogout = window.location.search.includes("logout=true");
        
        // 1. Recover tokens from storage
        const storedToken = storage.getItem<string>("access_token");
        const storedRefreshToken = storage.getItem<string>("refresh_token");
        const storedIdToken = storage.getItem<string>("id_token");

        const initOptions: any = {
          checkLoginIframe: false,
          pkceMethod: "S256",
          enableLogging: true,
          // Use check-sso but ONLY if we don't have a token to try first
          onLoad: (storedToken && !isLogout) ? undefined : 'check-sso',
          silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
          token: storedToken || undefined,
          refreshToken: storedRefreshToken || undefined,
          idToken: storedIdToken || undefined,
        };

        console.log("[Auth] Initializing Keycloak...", storedToken ? "with stored token" : "fresh check-sso");
        
        const authenticated = await keycloak.init(initOptions);

        // 2. Handle Authentication Success
        if (!isLogout && (authenticated || keycloak.authenticated)) {
          const userInfo = extractUserFromToken();
          if (userInfo && keycloak.token) {
            setUser(userInfo);
            // Persist for next refresh
            storage.setItem("access_token", keycloak.token);
            storage.setItem("refresh_token", keycloak.refreshToken);
            storage.setItem("id_token", keycloak.idToken);
            storage.setItem("username", userInfo.username);
            storage.setItem("role", userInfo.role);
          }
        } 
        // 3. Handle Authentication Failure
        else if (!isLogout && !authenticated) {
            console.warn("[Auth] Not authenticated after init");
            setUser(null);
            storage.removeItem("access_token");
            storage.removeItem("refresh_token");
            storage.removeItem("id_token");

            // ONLY redirect if we are trying to access a protected route
            const isPublicRoute = window.location.pathname === "/" || window.location.pathname === "/login";
            if (!isPublicRoute) {
                console.log("[Auth] Protected route detected, forcing login redirect");
                keycloak.login();
            }
        }

        setKeycloakReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error("[Auth] Keycloak init critical failure:", err);
        setKeycloakReady(true);
        setIsLoading(false);
      }
    };

    initKeycloak();

    // Token refresh handler
    keycloak.onTokenExpired = () => {
      keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (refreshed && keycloak.token) {
            setCachedAccessToken(keycloak.token);
            storage.setItem("access_token", keycloak.token);
          }
        })
        .catch(() => {
          console.error("Token refresh failed");
          if (!isBackendDown()) {
            console.warn("Redirecting to login as backend is available but refresh failed.");
            setUser(null);
            clearCachedAccessToken();
            storage.clear();
            keycloak.login({
              redirectUri: window.location.origin + "/login"
            });
          } else {
            console.warn("Suppressing login redirect after refresh failure because backend is currently unreachable.");
          }
        });
    };

    // Auth success handler (after redirect back from Keycloak)
    keycloak.onAuthSuccess = () => {
      if (keycloak.token) {
        const userInfo = extractUserFromToken();
        if (userInfo) {
          setUser(userInfo);
          setCachedAccessToken(keycloak.token);
          storage.setItem("access_token", keycloak.token);
          storage.setItem("username", userInfo.username);
          storage.setItem("role", userInfo.role);
        }
      }
    };

  }, []);

  const loginWithKeycloak = useCallback(() => {
    keycloak.login({
      redirectUri: window.location.origin + "/login"
    });
  }, []);


  const logout = useCallback(() => {
    clearCachedAccessToken();
    storage.clear();
    setUser(null);
    keycloak.logout({
      redirectUri: window.location.origin + "/login?logout=true",
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loginWithKeycloak,
        logout,
        isLoading,
        keycloakReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ============================================
// LEGACY LOCAL AUTH (TEMPORARILY DISABLED)
// This block is preserved for future use when LDAP via Keycloak is fully stable.
// Do NOT remove. Will be re-enabled later.
// ============================================
//
// interface LegacyAuthContextType {
//   user: User | null;
//   isAuthenticated: boolean;
//   login: (username: string, role: Role, token: string) => void;
//   loginWithSSO: (role: Role) => Promise<void>;
//   logout: () => void;
//   isLoading: boolean;
// }
//
// const login = (username: string, role: Role, token: string) => {
//   storage.setItem("access_token", token);
//   storage.setItem("username", username);
//   storage.setItem("role", role);
//   setCachedAccessToken(token);
//   setUser({
//     username,
//     role,
//     groups: role === "admin" ? ["admins"] : role === "data_steward" ? ["stewards"] : ["users"]
//   });
// };
//
// const loginWithSSO = async (role: Role) => {
//   setIsLoading(true);
//   // Simulate SSO delay
//   await new Promise((resolve) => setTimeout(resolve, 1500));
//
//   const mockToken = `sso_mock_token_${Math.random().toString(36).substring(7)}`;
//   const mockUsername = `sso_${role}_user`;
//
//   storage.setItem("access_token", mockToken);
//   storage.setItem("username", mockUsername);
//   storage.setItem("role", role);
//   setCachedAccessToken(mockToken);
//
//   setUser({
//     username: mockUsername,
//     role,
//     groups: role === "admin" ? ["admins"] : role === "data_steward" ? ["stewards"] : ["users"]
//   });
//   setIsLoading(false);
// };
