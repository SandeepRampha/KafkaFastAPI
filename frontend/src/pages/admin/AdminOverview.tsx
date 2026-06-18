import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/utils";
import Database from "lucide-react/dist/esm/icons/database";
import Shield from "lucide-react/dist/esm/icons/shield";
import Clock from "lucide-react/dist/esm/icons/clock";
import Server from "lucide-react/dist/esm/icons/server";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Cpu from "lucide-react/dist/esm/icons/cpu";
import Layout from "lucide-react/dist/esm/icons/layout";
import RefreshCcw from "lucide-react/dist/esm/icons/refresh-ccw";
import { useNavigate } from "react-router-dom";
import type { ClusterCard } from "../../lib/metrics";

import { useToast } from "../../contexts/NotificationContext";
import { useHealth } from "../../hooks/queries/useHealth";

export default function AdminOverview() {
    const toast = useToast();
    const navigate = useNavigate();

    const { data: healthData, isLoading, isFetching, refetch } = useHealth();

    const handleRefresh = async () => {
        await refetch();
        toast.success("Cluster metrics refreshed successfully.");
    };

    const clusterMetrics: ClusterCard[] = [
        {
            title: "Cluster Overview",
            icon: Layout,
            status: isLoading ? "LOADING" : (healthData?.cluster_state === "Healthy" ? "HEALTHY" : "UNHEALTHY"),
            metrics: [
                { label: "Cluster Name", value: healthData?.cluster_overview?.cluster_name || (isLoading ? "..." : "---") },
                { label: "Cluster ID", value: healthData?.cluster_overview?.cluster_id || (isLoading ? "..." : "---") },
                { label: "Confluent Version", value: healthData?.cluster_overview?.confluent_version || (isLoading ? "..." : "---") },
                { label: "Mode", value: healthData?.cluster_overview?.mode || (isLoading ? "..." : "KRaft") },
                { label: "Connection Latency", value: healthData?.cluster_overview?.connection_latency_ms ? `${healthData.cluster_overview.connection_latency_ms} ms` : (isLoading ? "..." : "---") },
                { label: "Last Metadata Refresh", value: healthData?.cluster_overview?.last_metadata_refresh || (isLoading ? "..." : "---") },
            ],
        },
        {
            title: "Broker Status",
            icon: Server,
            metrics: [
                { label: "Total Brokers", value: healthData?.broker_status?.total_brokers?.toString() || (isLoading ? "..." : "---") },
                { label: "Online", value: healthData?.broker_status ? `${healthData.broker_status.online_brokers}` : (isLoading ? "..." : "---"), status: healthData?.broker_status?.offline_brokers === 0 ? "success" : "destructive" },
                { label: "Offline", value: healthData?.broker_status ? `${healthData.broker_status.offline_brokers}` : (isLoading ? "..." : "---"), status: healthData?.broker_status?.offline_brokers === 0 ? "success" : "destructive" },
                { label: "Total Partitions", value: healthData?.broker_status?.total_partitions?.toString() || (isLoading ? "..." : "---") },
                { label: "Total Replicas", value: healthData?.broker_status?.total_replicas?.toString() || (isLoading ? "..." : "---") },
                { label: "Under-Replicated Partitions", value: healthData?.broker_status?.under_replicated_partitions?.toString() || (isLoading ? "..." : "0"), status: healthData?.broker_status?.under_replicated_partitions === 0 ? "success" : "warning" },
            ],
        },
        {
            title: "Controller Health",
            icon: Cpu,
            metrics: [
                { label: "Offline Partitions", value: healthData?.broker_status?.offline_partitions?.toString() || (isLoading ? "..." : "0"), status: healthData?.broker_status?.offline_partitions === 0 ? "success" : "destructive" },
                { label: "Controller ID", value: healthData?.broker_status?.controller_id?.toString() || (isLoading ? "..." : "---") },
                {
                    label: "Broker Hosts",
                    value: healthData?.broker_status?.broker_hosts?.length ? (
                        <span className="relative group/tooltip cursor-pointer inline-block">
                            <span className="border-b border-slate-400 font-bold">
                                {healthData.broker_status.broker_hosts.length} Hosts
                            </span>
                            <span className="pointer-events-none absolute bottom-full right-0 mb-2 z-50 w-max max-w-[220px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg px-3 py-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">Broker Hosts</span>
                                {[...healthData.broker_status.broker_hosts].sort().map((host: string, i: number) => (
                                    <span key={i} className="block text-xs text-slate-600 dark:text-slate-300 truncate">{host}</span>
                                ))}
                            </span>
                        </span>
                    ) : (isLoading ? "..." : "---")
                },
                { label: "Active Controller ID", value: healthData?.controller_health?.active_controller_id?.toString() || (isLoading ? "..." : "---") },
                { label: "Is Active", value: healthData?.controller_health?.is_active ? "Yes" : (isLoading ? "..." : "No"), status: healthData?.controller_health?.is_active ? "success" : "destructive" },
            ],
        },
    ];

    const stats = [
        { label: "Topics Count", value: healthData?.topics_count?.toString() || (isLoading ? "..." : "---"), icon: Database, color: "text-primary", bg: "bg-primary/10", path: "/admin-topics" },
        { label: "ACL's Count", value: healthData?.acls_count?.toString() || (isLoading ? "..." : "---"), icon: Shield, color: "text-purple-400", bg: "bg-purple-400/10", path: "/admin-acls" },
    ];

    const topicRequestStats = [
        { label: "Approved", value: healthData?.requests?.topics?.approved?.toString() || (isLoading ? "..." : "0"), icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "Rejected", value: healthData?.requests?.topics?.rejected?.toString() || (isLoading ? "..." : "0"), icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
        { label: "Pending", value: healthData?.requests?.topics?.pending?.toString() || (isLoading ? "..." : "0"), icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    ];

    const aclRequestStats = [
        { label: "Approved", value: healthData?.requests?.acls?.approved?.toString() || (isLoading ? "..." : "0"), icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "Rejected", value: healthData?.requests?.acls?.rejected?.toString() || (isLoading ? "..." : "0"), icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
        { label: "Pending", value: healthData?.requests?.acls?.pending?.toString() || (isLoading ? "..." : "0"), icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    ];

    return (
        <DashboardLayout
            role="admin"
            title="Admin Dashboard"
            description="Kafka Cluster Orchestration & Health Control"
        >
            <div className="flex justify-end  mb-1">
                <Button
                    onClick={handleRefresh}
                    disabled={isFetching}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-none gap-1.5 font-semibold text-xs shadow-none text-slate-600 dark:text-slate-300"
                >
                    <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                    {isFetching ? "Refreshing..." : "Refresh Metrics"}
                </Button>
            </div>

            <div className="relative">
                {/* Summary Statistics Section */}
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {stats.map((stat, i) => (
                            <Card
                                key={i}
                                className="glass-panel border-l-4 border-l-primary/50 overflow-hidden relative group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                                onClick={() => navigate(stat.path)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                            <div className="text-4xl font-black mt-1 tracking-tighter text-foreground/90">{stat.value}</div>
                                        </div>
                                        <div className={`h-16 w-16 rounded-2xl ${stat.bg} flex items-center justify-center transition-transform duration-500 border border-slate-200 dark:border-slate-800`}>
                                            <stat.icon className={`h-8 w-8 ${stat.color}`} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Topic Requests Section */}
                        <Card className="glass-panel border-slate-200 dark:border-slate-800 overflow-hidden group hover:shadow-lg transition-all duration-500">
                            <CardHeader className="py-3 px-5 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-primary/10 rounded-lg">
                                            <Database className="w-4 h-4 text-primary" />
                                        </div>
                                        <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/70">Topic Requests</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5">
                                <div className="grid gap-4 grid-cols-3">
                                    {topicRequestStats.map((stat, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className={`h-12 w-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-2.5 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                                <stat.icon className="h-5 w-5" />
                                            </div>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center mb-0.5">{stat.label}</p>
                                            <div className="text-xl font-black tracking-tighter text-foreground/90">{stat.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* ACL Requests Section */}
                        <Card className="glass-panel border-slate-200 dark:border-slate-800 overflow-hidden group hover:shadow-lg transition-all duration-500">
                            <CardHeader className="py-3 px-5 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-500/10 rounded-lg">
                                            <Shield className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground/70">ACL Requests</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5">
                                <div className="grid gap-4 grid-cols-3">
                                    {aclRequestStats.map((stat, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className={`h-12 w-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-2.5 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                                <stat.icon className="h-5 w-5" />
                                            </div>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center mb-0.5">{stat.label}</p>
                                            <div className="text-xl font-black tracking-tighter text-foreground/90">{stat.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* AI Insights Section removed */}

                {/* Cluster Throughput Chart (Commented)
                <div className="mt-8">
                    <ClusterThroughputChart />
                </div>
                */}

                <div className="mb-2 mt-8">
                    <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                        Cluster State
                    </h2>
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-3 pb-8">
                    {clusterMetrics.map((card, idx) => (
                        <Card key={idx} className="glass-panel hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 group relative overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-primary/20">
                                            <card.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold tracking-tight text-foreground/90">{card.title}</CardTitle>
                                            {card.status && (
                                                <Badge
                                                    variant={
                                                        card.status === "LOADING" ? "outline" :
                                                            card.status === "HEALTHY" ? "success" :
                                                                card.status === "DEGRADED" ? "warning" :
                                                                    "destructive"
                                                    }
                                                    className={cn(
                                                        "mt-0.5 text-[10px] py-0 px-2 rounded-md",
                                                        card.status === "LOADING" && "animate-pulse"
                                                    )}
                                                >
                                                    {card.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 pb-4 px-5">
                                <div className="space-y-3">
                                    {card.metrics.map((metric, midx) => (
                                        <div key={midx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 -mx-2 rounded-lg transition-colors group/row">
                                            <span className="text-muted-foreground font-medium group-hover/row:text-foreground/90 transition-colors">{metric.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold tracking-tight ${metric.status === "success" ? "text-green-600 dark:text-green-400" :
                                                    metric.status === "warning" ? "text-yellow-600 dark:text-yellow-400" :
                                                        metric.status === "destructive" ? "text-red-600 dark:text-red-400" :
                                                            "text-foreground/80"
                                                    }`}>
                                                    {metric.value}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}

