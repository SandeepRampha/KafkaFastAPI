export interface Metric {
    label: string;
    value: React.ReactNode | string;
    status?: "success" | "warning" | "destructive";
}

export interface ClusterCard {
    title: string;
    icon: any;
    status?: "HEALTHY" | "DEGRADED" | "CRITICAL" | "LOADING" | "UNHEALTHY";
    metrics: Metric[];
}
