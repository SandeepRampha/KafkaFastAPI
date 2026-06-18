import { Suspense } from "react";
import { lazy } from "./lib/lazyRetry";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LazyMotion } from "framer-motion";
import { loadFramerFeatures } from "./lib/FramerFeatures";
import { PageLoader } from "./components/ui/PageLoader";
import { NotificationProvider } from "./contexts/NotificationContext";
import { BackendErrorProvider, useBackendError } from "./contexts/BackendErrorContext";
import { ErrorFallback } from "./components/ui/ErrorFallback";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SessionManager } from "./components/auth/SessionManager";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./contexts/AuthContext";


const LazyToaster = lazy(() => import("./components/ui/LazyToaster"));

const Login = lazy(() => import("./pages/Login"));

const LandingPage = lazy(() => import("./pages/LandingPage"));

// Admin imports
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminTopics = lazy(() => import("./pages/admin/AdminTopics"));
const AdminTopicRequests = lazy(() => import("./pages/admin/AdminTopicRequests"));
const AdminACLRequests = lazy(() => import("./pages/admin/AdminACLRequests"));
const AdminACLs = lazy(() => import("./pages/admin/AdminACLs"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminSchemaRegistry = lazy(() => import("./pages/admin/AdminSchemaRegistry"));

// User imports
const UserTopicRequests = lazy(() => import("./pages/user/UserTopicRequests"));
const UserACLRequests = lazy(() => import("./pages/user/UserACLRequests"));
const UserTopicCatalog = lazy(() => import("./pages/user/UserTopicCatalog"));
const UserTopicDetails = lazy(() => import("./pages/user/UserTopicDetails"));
const UserACLCatalog = lazy(() => import("./pages/user/UserACLCatalog"));
const UserSchemaRegistry = lazy(() => import("./pages/user/UserSchemaRegistry"));
const AnalyzePolicy = lazy(() => import("./pages/user/AnalyzePolicy"));
const AIAssistantPage = lazy(() => import("./pages/shared/AIAssistantPage"));
const GovernanceRegistry = lazy(() => import("./pages/shared/GovernanceRegistry"));

const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));

const SuspenseRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

import { NetworkProvider } from "./contexts/NetworkContext";
import { ReconnectBanner } from "./components/ui/ReconnectBanner";

import { useAuth } from "./contexts/AuthContext";

const AppContent = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { backendError, isTransient } = useBackendError();

  // 1. Block rendering until Keycloak is initialized
  if (isLoading) {
    return <PageLoader />;
  }

  // 2. ONLY show full screen blackout if it's a HARD failure (not transient sleep/tab switch)
  if (backendError && !isTransient) {
    return <ErrorFallback />;
  }

  return (
    <>
      <ReconnectBanner />
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated && user ? (
              <Navigate to={user.role === "admin" ? "/admin-dashboard" : "/home"} replace />
            ) : (
              <SuspenseRoute><LandingPage /></SuspenseRoute>
            )
          } 
        />
        <Route path="/login" element={<SuspenseRoute><Login /></SuspenseRoute>} />

        {/* Protected User Routes */}
        <Route element={<ProtectedRoute allowedRoles={["user", "admin", "data_steward"]} />}>
          <Route path="/home" element={<SuspenseRoute><UserDashboard /></SuspenseRoute>} />
          <Route path="/topic-catalog" element={<SuspenseRoute><UserTopicCatalog /></SuspenseRoute>} />
          <Route path="/topics" element={<SuspenseRoute><UserTopicRequests /></SuspenseRoute>} />
          <Route path="/acls" element={<SuspenseRoute><UserACLCatalog /></SuspenseRoute>} />
          <Route path="/acl-requests" element={<SuspenseRoute><UserACLRequests /></SuspenseRoute>} />
          <Route path="/topics/:topicName" element={<SuspenseRoute><UserTopicDetails /></SuspenseRoute>} />
          <Route path="/schema-registry" element={<SuspenseRoute><UserSchemaRegistry /></SuspenseRoute>} />
          <Route path="/ai-assistant" element={<SuspenseRoute><AIAssistantPage /></SuspenseRoute>} />
          <Route path="/analyze-policy" element={<SuspenseRoute><AnalyzePolicy /></SuspenseRoute>} />
          <Route path="/governance" element={<SuspenseRoute><GovernanceRegistry /></SuspenseRoute>} />
        </Route>

        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin-dashboard" element={<SuspenseRoute><AdminOverview /></SuspenseRoute>} />
          <Route path="/admin-topics" element={<SuspenseRoute><AdminTopics /></SuspenseRoute>} />
          <Route path="/admin-requests" element={<SuspenseRoute><AdminTopicRequests /></SuspenseRoute>} />
          <Route path="/admin-acl-requests" element={<SuspenseRoute><AdminACLRequests /></SuspenseRoute>} />
          <Route path="/admin-acls" element={<SuspenseRoute><AdminACLs /></SuspenseRoute>} />
          <Route path="/admin-logs" element={<SuspenseRoute><AdminLogs /></SuspenseRoute>} />
          <Route path="/admin-schema-registry" element={<SuspenseRoute><AdminSchemaRegistry /></SuspenseRoute>} />
        </Route>

      </Routes>
    </>
  );
};

function App() {
  return (
    <LazyMotion features={loadFramerFeatures} strict>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BackendErrorProvider>
            <NetworkProvider>
              <NotificationProvider>
                <BrowserRouter>
                  <Suspense fallback={null}>
                    <LazyToaster />
                  </Suspense>
                  <SessionManager />
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </BrowserRouter>
                <ReactQueryDevtools initialIsOpen={false} />
              </NotificationProvider>
            </NetworkProvider>
          </BackendErrorProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LazyMotion>
  );
}

export default App;
