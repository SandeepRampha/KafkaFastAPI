import { useState } from "react";
import { storage } from "../../lib/storage";
import { NavLink } from "react-router-dom";
import { KafkaLogo } from "../ui/KafkaLogo";
import { cn } from "../../lib/utils";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Database from "lucide-react/dist/esm/icons/database";
import Shield from "lucide-react/dist/esm/icons/shield";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import ScrollText from "lucide-react/dist/esm/icons/scroll-text";
import FlaskConical from "lucide-react/dist/esm/icons/flask-conical";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import PanelLeftClose from "lucide-react/dist/esm/icons/panel-left-close";
import PanelLeft from "lucide-react/dist/esm/icons/panel-left";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { queryClient } from "../../lib/queryClient";
import { fetchTopics, fetchACLs, fetchTopicRequests, fetchACLRequests, fetchMyRequests } from "../../services/adminService";
import { default as api } from "../../services/api";
import { topicKeys } from "../../hooks/queries/useTopics";
import { aclKeys } from "../../hooks/queries/useACLs";
import { topicRequestKeys } from "../../hooks/queries/useTopicRequests";
import { aclRequestsKeys } from "../../hooks/queries/useACLRequests";
import { requestKeys } from "../../hooks/queries/useMyRequests";
import { healthKeys } from "../../hooks/queries/useHealth";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
    role: "admin" | "user" | "data_steward";
    isOpen: boolean;
    onToggle: () => void;
}

export function Sidebar({ role, isOpen, onToggle }: SidebarProps) {
    const { logout: authLogout } = useAuth();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogoutClick = () => {
        setIsLogoutModalOpen(true);
    };

    const confirmLogout = () => {
        authLogout();
        setIsLogoutModalOpen(false);
    };

    const handlePrefetch = (to: string) => {
        const username = storage.getItem<string>("username");
        const principal = username ? `User:${username}` : undefined;

        switch (to) {
            case "/admin-dashboard":
                if (role === "admin") {
                    queryClient.prefetchQuery({
                        queryKey: healthKeys.all,
                        queryFn: async () => {
                            const response = await api.get("/health");
                            return response.data;
                        },
                        staleTime: 30000,
                    });
                }
                break;
            case "/admin-topics":
            case "/home":
                queryClient.prefetchQuery({
                    queryKey: topicKeys.list("default", 1, 10),
                    queryFn: () => fetchTopics("default", 1, 10),
                });
                if (to === "/home") {
                    queryClient.prefetchQuery({
                        queryKey: requestKeys.list("default", 1, 10),
                        queryFn: () => fetchMyRequests("default", 1, 10),
                    });
                }
                break;
            case "/admin-acls":
            case "/acls":
                queryClient.prefetchQuery({
                    queryKey: aclKeys.list("default", to === "/acls" ? principal : undefined, 1, 10),
                    queryFn: () => fetchACLs("default", to === "/acls" ? principal : undefined, 1, 10),
                });
                break;
            case "/admin-requests":
            case "/topics":
                queryClient.prefetchQuery({
                    queryKey: topicRequestKeys.list("default", 1, 10),
                    queryFn: () => fetchTopicRequests("default", 1, 10),
                });
                break;
            case "/admin-acl-requests":
            case "/acl-requests":
                queryClient.prefetchQuery({
                    queryKey: aclRequestsKeys.list("default", 1, 10),
                    queryFn: () => fetchACLRequests("default", 1, 10),
                });
                break;
        }
    };

    const adminLinks = [
        { to: "/admin-dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/admin-topics", icon: Database, label: "Topics Catalog" },
        { to: "/admin-acls", icon: Shield, label: "ACLs" },
        { to: "/governance", icon: ShieldCheck, label: "Governance Hub" },
        { to: "/admin-schema-registry", icon: FlaskConical, label: "Schema Registry" },
        { to: "/admin-logs", icon: ScrollText, label: "Logs" },
        { to: "/ai-assistant", icon: MessageSquare, label: "Ask Kafka AI" },
        { to: "/analyze-policy", icon: ShieldCheck, label: "Analyze Policy" },
    ];

    const userLinks = [
        { to: "/home", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/topic-catalog", icon: Database, label: "Topics Catalog" },
        { to: "/acls", icon: Shield, label: "ACLs" },
        { to: "/governance", icon: ShieldCheck, label: "Governance Hub" },
        { to: "/schema-registry", icon: FlaskConical, label: "Schema Registry" },
        { to: "/ai-assistant", icon: MessageSquare, label: "Ask Kafka AI" },
        { to: "/analyze-policy", icon: ShieldCheck, label: "Analyze Policy" },
    ];

    const stewardLinks = [
        { to: "/home", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/topic-catalog", icon: Database, label: "Topics Catalog" },
        { to: "/acls", icon: Shield, label: "ACLs" },
        { to: "/governance", icon: ShieldCheck, label: "Governance Hub" },
        { to: "/ai-assistant", icon: MessageSquare, label: "Ask Kafka AI" },
        { to: "/analyze-policy", icon: ShieldCheck, label: "Analyze Policy" },
    ];

    const links = role === "admin" 
        ? adminLinks 
        : role === "data_steward" 
            ? stewardLinks 
            : userLinks;

    return (
        <>
            <aside
                className={cn(
                    "flex h-full flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-300 relative z-[100] isolate overflow-x-hidden",
                    isOpen ? "w-64" : "w-[72px]"
                )}
            >
                <div className="p-4 flex items-center justify-between">
                    <div
                        className={cn("flex items-center gap-3 font-bold text-xl text-foreground/90 group/logo select-none cursor-pointer", !isOpen && "justify-center w-full")}
                        onClick={() => navigate(role === "admin" ? "/admin-dashboard" : "/home")}
                    >
                        {isOpen ? (
                            <>
                                <div className="p-1.5 bg-primary/10 rounded-xl transition-[background-color] duration-300 group-hover/logo:bg-primary/20 shadow-sm">
                                    <KafkaLogo className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-xl font-black tracking-tighter text-primary">KafkaManager</span>
                            </>
                        ) : (
                            <Tooltip content="Expand Sidebar" side="right" delay={100}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggle();
                                    }}
                                    className="relative p-2.5 bg-primary/10 rounded-xl hover:bg-primary/20 transition-all group"
                                >
                                    <KafkaLogo className="h-5 w-5 text-primary transition-opacity duration-300 group-hover:opacity-0" />
                                    <PanelLeft className="absolute inset-0 m-auto h-5 w-5 text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    {isOpen && (
                        <Tooltip content="Close Sidebar" side="bottom" delay={100}>
                            <button
                                onClick={onToggle}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-primary"
                            >
                                <PanelLeftClose className="h-5 w-5" />
                            </button>
                        </Tooltip>
                    )}
                </div>

                <div className="flex-1 px-3 space-y-1.5 mt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {links.map((link) => {
                        const LinkContent = (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                onMouseEnter={() => handlePrefetch(link.to)}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 group relative",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                                        !isOpen && "justify-center px-2"
                                    )
                                }
                            >
                                <link.icon className="h-5 w-5 shrink-0" />
                                <span className={cn(
                                    "whitespace-nowrap transition-[width,opacity] duration-300",
                                    isOpen ? "w-auto opacity-100" : "w-0 opacity-0 hidden"
                                )}>
                                    {link.label}
                                </span>
                            </NavLink>
                        );

                        return !isOpen ? (
                            <Tooltip key={link.to} content={link.label} side="right" delay={0} triggerClassName="w-full">
                                {LinkContent}
                            </Tooltip>
                        ) : (
                            LinkContent
                        );
                    })}
                </div>

                <div className="p-4 mt-auto">
                    {isOpen ? (
                        <Button
                            variant="ghost"
                            className="w-full gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 py-5 transition-all text-sm justify-start px-3"
                            onClick={handleLogoutClick}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            <span>Logout</span>
                        </Button>
                    ) : (
                        <Tooltip content="Logout" side="right" delay={0} triggerClassName="w-full">
                            <Button
                                variant="ghost"
                                className="w-full gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 py-5 transition-all text-sm justify-center px-0"
                                onClick={handleLogoutClick}
                            >
                                <LogOut className="h-5 w-5 shrink-0" />
                            </Button>
                        </Tooltip>
                    )}
                </div>
            </aside >

            <Modal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                title={
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                        <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-xl">
                            <LogOut className="h-5 w-5" />
                        </div>
                        <span>Confirm Logout</span>
                    </div>
                }
                className="max-w-[400px]"
            >
                <div className="space-y-6">
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">
                        Are you sure you want to logout? You will need to sign in again to access the dashboard.
                    </p>

                    <div className="flex gap-3">
                        <Button
                            variant="cancel"
                            onClick={() => setIsLogoutModalOpen(false)}
                            className="flex-1 h-11 rounded-xl font-semibold transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmLogout}
                            className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white h-11 rounded-xl font-semibold shadow-sm transition-all active:scale-95"
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}