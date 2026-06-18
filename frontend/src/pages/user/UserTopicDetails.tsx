import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Activity from "lucide-react/dist/esm/icons/activity";
import Settings from "lucide-react/dist/esm/icons/settings";
import Users from "lucide-react/dist/esm/icons/users";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import { useState } from "react";
import { useTopic } from "../../hooks/queries/useTopic";
import { PageLoader } from "../../components/ui/PageLoader";
import { cn } from "../../lib/utils";
import { MetadataPanel } from "../../components/metadata/MetadataPanel";

export default function UserTopicDetails() {
    const { topicName } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const { data: topicData, isLoading, error } = useTopic(topicName || "");

    if (isLoading) return <PageLoader />;

    if (error || !topicData) {
        return (
            <DashboardLayout role="user" title="Error" description="Failed to load topic details">
                <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                    <p className="text-destructive font-medium">Error loading topic information.</p>
                    <Button onClick={() => navigate(-1)}>Back to Catalog</Button>
                </div>
            </DashboardLayout>
        );
    }

    const consumers = [
        { group: "payment-processor-group", lag: 124, status: "Stable" },
        { group: "analytics-sink-v2", lag: 0, status: "Stable" },
        { group: "audit-logger", lag: 4500, status: "Lagging" },
    ];

    const messages = [
        { offset: 1024, timestamp: "2024-03-20 10:00:01", key: "user_123", value: "{ event: 'login', status: 'success' }" },
        { offset: 1025, timestamp: "2024-03-20 10:00:02", key: "user_456", value: "{ event: 'purchase', amount: 50.00 }" },
        { offset: 1026, timestamp: "2024-03-20 10:00:05", key: "user_789", value: "{ event: 'logout' }" },
    ];

    const isrCount = topicData.partitions?.reduce((acc, p) => acc + (p.isrs?.length || 0), 0) || 0;
    const totalReplicas = (topicData.num_partitions || 1) * topicData.replication_factor;
    const isHealthy = isrCount === totalReplicas && isrCount > 0;
    const isDegraded = isrCount < totalReplicas && isrCount > 0;
    
    const healthStatus = isHealthy ? "Healthy" : isDegraded ? "Under-replicated" : "Unavailable";
    const healthVariant = isHealthy ? "success" : isDegraded ? "warning" : "destructive";

    return (
        <DashboardLayout
            role="user"
            title={topicData.name || "Topic Details"}
            description={`${topicData.num_partitions} Partitions • ${topicData.replication_factor}x Replication`}
        >
            <div className="mb-6">
                <Button
                    variant="ghost"
                    className="mb-4 pl-0 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(-1)}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Catalog
                </Button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3 text-slate-900 dark:text-slate-100">
                            {topicData.name}
                            <Badge variant={healthVariant} className="text-sm font-normal">
                                {healthStatus}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground dark:text-slate-400">
                            {topicData.num_partitions} Partitions • {topicData.replication_factor}x Replication
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                {[
                    { id: "overview", label: "Overview", icon: Activity },
                    { id: "config", label: "Configuration", icon: Settings },
                    { id: "consumers", label: "Consumers", icon: Users },
                    { id: "messages", label: "Messages", icon: MessageSquare },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                            ${activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"}
                        `}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="glass-panel relative overflow-hidden">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                                        Messages In (Rate)
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 opacity-50">Simulated</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent><div className="text-2xl font-bold">2.4k / sec</div></CardContent>
                            </Card>
                            <Card className="glass-panel relative overflow-hidden">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                                        Bytes In (Rate)
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 opacity-50">Simulated</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent><div className="text-2xl font-bold">4.5 MB / sec</div></CardContent>
                            </Card>
                            <Card className="glass-panel relative overflow-hidden">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                                        Active Segments
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 opacity-50">Simulated</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent><div className="text-2xl font-bold">1,024</div></CardContent>
                            </Card>
                            <Card className="glass-panel">
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">Total ISRs</CardTitle></CardHeader>
                                <CardContent>
                                    <div className={`text-2xl font-bold ${isHealthy ? 'text-green-500' : 'text-amber-500'}`}>
                                        {isrCount} / {totalReplicas}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Metadata Enrichment Panel */}
                        <MetadataPanel topicName={topicData.name} />
                    </div>
                )}

                {activeTab === "config" && (
                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle>Topic Configurations</CardTitle>
                            <CardDescription>Current configuration overrides for this topic.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">Configuration Key</th>
                                            <th className="px-4 py-3">Value</th>
                                            <th className="px-4 py-3">Source</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-semibold font-mono text-slate-700 dark:text-slate-200">retention.ms</td>
                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{topicData.retention_ms || topicData.config?.["retention.ms"] || "---"}</td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-500 text-xs italic">Dynamic Config</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-semibold font-mono text-slate-700 dark:text-slate-200">retention.bytes</td>
                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{topicData.config?.["retention.bytes"] || "---"}</td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-500 text-xs italic">Dynamic Config</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-semibold font-mono text-slate-700 dark:text-slate-200">cleanup.policy</td>
                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{topicData.cleanup_policy || topicData.config?.["cleanup.policy"] || "delete"}</td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-500 text-xs italic">Default</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "consumers" && (
                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle>Consumer Groups</CardTitle>
                            <CardDescription>Groups currently reading from {topicData.name}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">Consumer Group ID</th>
                                            <th className="px-4 py-3">Lag (msg)</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {consumers.map((c) => (
                                            <tr key={c.group} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{c.group}</td>
                                                <td className="px-4 py-3 font-mono font-semibold text-slate-600 dark:text-slate-400">{c.lag.toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <Badge 
                                                      className={cn(
                                                        "font-semibold rounded-md border shadow-none",
                                                        c.status === 'Stable' 
                                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                      )}
                                                    >
                                                      {c.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === "messages" && (
                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle>Recent Messages</CardTitle>
                            <CardDescription>A live sample of messages flowing through.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">Offset</th>
                                            <th className="px-4 py-3">Timestamp</th>
                                            <th className="px-4 py-3 text-center">Key</th>
                                            <th className="px-4 py-3">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {messages.map((m) => (
                                            <tr key={m.offset} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-500 text-[13px]">{m.offset}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400 text-[13px]">{m.timestamp}</td>
                                                <td className="px-4 py-3 font-mono font-semibold text-primary/70 text-center text-[13px]">{m.key}</td>
                                                <td className="px-4 py-3 font-mono text-xs opacity-80 text-slate-600 dark:text-slate-400 truncate max-w-xs" title={m.value}>
                                                    {m.value}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
