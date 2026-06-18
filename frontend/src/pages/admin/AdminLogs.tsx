import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import Terminal from "lucide-react/dist/esm/icons/terminal";

export default function AdminLogs() {
    return (
        <DashboardLayout role="admin" title="System Logs" description="Live streaming logs from cluster brokers and services.">
            <Card className="glass-panel border-none shadow-sm dark:bg-slate-900 transition-colors duration-300 mb-6">
                <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
                    <div className="space-y-1.5">
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Terminal className="h-6 w-6 text-primary" />
                            Log Registry
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                            Live streaming logs from cluster brokers and services.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-12 pt-4 flex flex-col items-center justify-center min-h-[360px] text-center">
                    <div className="bg-primary/5 dark:bg-slate-800/60 p-6 rounded-full mb-6 border border-primary/10">
                        <Terminal className="h-12 w-12 text-primary/60" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Under Maintenance</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        This feature is currently under active development. <br />
                        We are working hard to bring you <span className="font-semibold text-primary">real-time log streaming</span> in a future release.
                    </p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
