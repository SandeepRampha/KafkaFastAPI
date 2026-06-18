import { useState, useEffect, type ReactNode } from "react";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar"
import { ThemeToggle } from "../ui/ThemeToggle";
import { storage } from "../../lib/storage";
import { ProfileCard } from "../ui/ProfileCard";
import AlephysLogo from "../../assets/logo Alephys.webp";
import { SectionErrorBoundary } from "../ui/SectionErrorBoundary";
import { AIAssistant } from "../ai/AIAssistant";
import { useAuth } from "../../contexts/AuthContext";

interface DashboardLayoutProps {
    children: ReactNode;
    role: "admin" | "user" | "data_steward";
    title?: string;
    description?: string;
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
    const { user } = useAuth();
    const { width } = useWindowSize();
    const navigate = useNavigate();
    const location = useLocation();

    // Track the user's manual preference for sidebar state (persisted)
    const [userPreferOpen, setUserPreferOpen] = useState(() => {
        return storage.getItem<boolean>("sidebarState", true) ?? true;
    });

    // The actual live visual state of the sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) return false;
        return storage.getItem<boolean>("sidebarState", true) ?? true;
    });

    const [lastWidth, setLastWidth] = useState(width);

    // Friendly display names for roles
    const getRoleTitle = (r: string) => {
        if (r === "admin") return "Administrator";
        if (r === "data_steward") return "Data Steward";
        return "Member";
    };

    // Responsive Sidebar: Auto-collapse on small screens, Auto-expand on large screens
    useEffect(() => {
        const wasDesktop = lastWidth >= 1024;
        const isDesktop = width >= 1024;

        if (wasDesktop !== isDesktop) {
            if (isDesktop) {
                // Transitioning back to desktop: restore user preference
                setIsSidebarOpen(userPreferOpen);
            } else {
                // Transitioning to small screen: auto-collapse
                setIsSidebarOpen(false);
            }
        }
        setLastWidth(width);
    }, [width, lastWidth, userPreferOpen]);

    const handleToggle = () => {
        const newState = !isSidebarOpen;
        setIsSidebarOpen(newState);

        // Only update preference if we are currently on a desktop-sized screen
        if (width >= 1024) {
            setUserPreferOpen(newState);
            storage.setItem("sidebarState", newState);
        }
    };



    const currentRole = user?.role || role;
    const pageTitle = currentRole === "admin" ? "Admin Dashboard" : currentRole === "data_steward" ? "Governance Dashboard" : "User Dashboard";
    const pageDescription = currentRole === "admin" ? "Kafka Cluster Orchestration & Health Control" : currentRole === "data_steward" ? "Data Quality & Metadata Governance" : "Real-time Kafka Management";

    return (
        <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-900 text-foreground transition-colors duration-300 relative overflow-hidden font-sans">
            <SectionErrorBoundary name="Sidebar">
                <Sidebar role={currentRole} isOpen={isSidebarOpen} onToggle={handleToggle} />
            </SectionErrorBoundary>

            <main className="flex-1 relative overflow-hidden z-10 custom-scrollbar flex flex-col transition-colors duration-300 bg-white dark:bg-slate-950">
                {/* Sticky Header */}
                <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-2.5 flex justify-between items-center gap-6">
                        {/* Left Side: Page Title */}
                        <div>
                            <div
                                className="flex flex-col gap-0 cursor-pointer group"
                                onClick={() => navigate(role === "admin" ? "/admin-dashboard" : "/home")}
                            >
                                <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-primary transition-colors">
                                    {pageTitle}
                                </h1>
                                <p className="text-xs text-muted-foreground font-medium italic tracking-tight">
                                    {pageDescription}
                                </p>
                            </div>
                        </div>

                        {/* Right Side: Actions */}
                        <div className="flex items-center gap-6">
                            <ThemeToggle />

                            {/* Profile Badge */}
                            <ProfileCard
                                username={user?.username || "User"}
                                role={getRoleTitle(user?.role || role)}
                                orgName="Alephys"
                                orgLogoUrl={AlephysLogo}
                            />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-[1600px] w-full mx-auto p-4 lg:p-6">
                        <SectionErrorBoundary name="Main Content">
                            {children}
                        </SectionErrorBoundary>
                    </div>
                </div>
            </main>
            {location.pathname !== "/ai-assistant" && <AIAssistant />}
        </div>
    );
}
