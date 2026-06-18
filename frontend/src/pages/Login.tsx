import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/Card";
import { KafkaLogo } from "../components/ui/KafkaLogo";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import Lock from "lucide-react/dist/esm/icons/lock";
import { m } from "framer-motion";
import { storage } from "../lib/storage";

export default function Login() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const { loginWithKeycloak, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated (after Keycloak redirect-back)
  useEffect(() => {
    if (isAuthenticated && user) {
      storage.setItem("sidebarOpen", "true");
      if (user.role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (user.role === "data_steward") {
        navigate("/home", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSSOLogin = () => {
    try {
      loginWithKeycloak();
    } catch (err) {
      console.error(err);
      setMessage("SSO Authentication failed");
      setError(true);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-sans transition-[background-color] duration-500">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40 transition-opacity duration-500">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[0%] right-[-10%] w-[700px] h-[700px] bg-primary/30 rounded-full blur-[140px]" />
      </div>

      <m.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-lg px-6 relative z-10"
      >
        <div className="text-center mb-2">
          <m.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-primary to-primary/80 mb-2"
          >
            <KafkaLogo className="w-10 h-10 text-white" />
          </m.div>

          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
            Kafka Manager
          </h1>
          <p className="text-muted-foreground mt-2 text-base font-medium opacity-80">
            Enterprise Topic Management
          </p>
        </div>

        <Card className="border-border/10 glass-card rounded-3xl px-4 py-4 overflow-hidden mb-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-2xl font-bold text-foreground/90">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center font-medium opacity-70">
              Please sign in to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-6">
              {message && (
                <m.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs font-black uppercase tracking-wider text-center p-4 rounded-2xl border ${error
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-primary/10 text-primary border-primary/20"
                    }`}
                >
                  {message}
                </m.div>
              )}

              <Button
                type="button"
                id="sso-login-button"
                onClick={handleSSOLogin}
                className="w-full bg-primary hover:bg-primary/90 text-white h-16 rounded-2xl transition-all active:scale-[0.98] font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-primary/20 group"
                isLoading={isLoading}
              >
                <Lock className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                Sign in with SSO
              </Button>

              <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground opacity-50 px-6">
                Authorized access only. Authentication handled via enterprise identity provider.
              </p>
            </div>
          </CardContent>
        </Card>
      </m.div>

      {/* <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-50">
        <p className="text-[15px] font-black uppercase tracking-[0.5em] text-muted-foreground">
          Alph 1.0
        </p>
      </div> */}
    </div>
  );
}

// ============================================
// LEGACY LOGIN HANDLERS (TEMPORARILY DISABLED)
// This block is preserved for future use when LDAP login is re-enabled.
// Do NOT remove. Will be re-enabled later.
// ============================================
//
// const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();
//   if (showPassword) setShowPassword(false);
//   setLoading(true);
//   setMessage("");
//   setError(false);
//
//   try {
//     const params = new URLSearchParams();
//     params.append("grant_type", "");
//     params.append("username", username);
//     params.append("password", password);
//     params.append("scope", "");
//     params.append("client_id", "");
//     params.append("client_secret", "");
//
//     const response = await api.post("/login", params, {
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//     });
//
//     const data = response.data;
//
//     if (data.access_token) {
//       const ADMIN_USERS = ["admin", "kafka_admin"];
//       const finalUsername = data.username || username;
//       const isAppAdmin = ADMIN_USERS.includes(finalUsername) ||
//         (data.groups && data.groups.some((g: string) => g.includes("admin")));
//       const role = isAppAdmin ? "admin" : "user";
//       login(finalUsername, role, data.access_token);
//       storage.setItem("sidebarOpen", "true");
//       navigate(role === "admin" ? "/admin-dashboard" : "/home");
//     } else {
//       setError(true);
//       setMessage("Authentication failed");
//     }
//   } catch (err: any) {
//     console.error(err);
//     setError(true);
//     if (err.response?.status === 401) {
//       setMessage("Incorrect username or password");
//     } else if (err.response?.data?.detail) {
//       setMessage(err.response.data.detail);
//     } else {
//       setMessage("Connection error. Please try again.");
//     }
//   } finally {
//     setLoading(false);
//   }
// };
//
// const handleSSOLogin = async (role: Role) => {
//   try {
//     await loginWithSSO(role);
//     if (role === "admin") navigate("/admin-dashboard");
//     else if (role === "data_steward") navigate("/admin-dashboard");
//     else navigate("/home");
//   } catch (err) {
//     console.error(err);
//     setMessage("SSO Authentication failed");
//     setError(true);
//   }
// };