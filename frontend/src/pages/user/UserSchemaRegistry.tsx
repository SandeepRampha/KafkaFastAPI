import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import FlaskConical from "lucide-react/dist/esm/icons/flask-conical";

export default function UserSchemaRegistry() {

    return (
        <DashboardLayout role="user" title="Schema Registry" description="Browse and request schemas for your Kafka topics.">
            <Card className="glass-panel border-none shadow-sm dark:bg-slate-900 transition-colors duration-300 mb-6">
                <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
                    <div className="space-y-1.5">
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <FlaskConical className="h-6 w-6 text-primary" />
                            Schema Registry
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                            Browse and request schemas for your Kafka topics.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-12 pt-4 flex flex-col items-center justify-center min-h-[360px] text-center">
                    <div className="bg-primary/5 dark:bg-slate-800/60 p-6 rounded-full mb-6 border border-primary/10">
                        <FlaskConical className="h-12 w-12 text-primary/60" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">In Development</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        We are currently developing <span className="font-semibold text-primary">Schema Creation</span> and{" "}
                        <span className="font-semibold text-primary">Schema Request</span> features.<br />
                        These will be available in a future release.
                    </p>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
