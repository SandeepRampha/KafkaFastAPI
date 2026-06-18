
import { m } from 'framer-motion';
import User from 'lucide-react/dist/esm/icons/user';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Server from 'lucide-react/dist/esm/icons/server';
import Database from 'lucide-react/dist/esm/icons/database';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Activity from 'lucide-react/dist/esm/icons/activity';

export const HowItWorks = () => {
    const steps = [
        {
            icon: <User className="w-6 h-6" />,
            title: "User Request",
            desc: "User submits Topic or ACL request"
        },
        {
            icon: <FileText className="w-6 h-6" />,
            title: "Review",
            desc: "Admin reviews request details"
        },
        {
            icon: <UserCheck className="w-6 h-6" />,
            title: "Approval",
            desc: "Admin approves with comments"
        },
        {
            icon: <Server className="w-6 h-6" />,
            title: "Execution",
            desc: "System safely executes operation"
        }
    ];

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4">How It Works</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A seamless flow from request to execution, ensuring every change is tracked and valid.
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[2.75rem] left-0 w-full h-0.5 bg-border -z-10" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {steps.map((step, index) => (
                            <m.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                                className="flex flex-col items-center text-center bg-background"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center shadow-lg mb-6 relative z-10">
                                    <div className="text-primary">{step.icon}</div>

                                    {/* Step Number Badge */}
                                    <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md">
                                        {index + 1}
                                    </span>
                                </div>

                                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                                <p className="text-sm text-muted-foreground">{step.desc}</p>

                                {index < steps.length - 1 && (
                                    <ArrowRight className="md:hidden w-6 h-6 text-muted-foreground/30 mt-4 rotate-90" />
                                )}
                            </m.div>
                        ))}
                    </div>
                </div>

                <div className="mt-20 grid md:grid-cols-2 gap-8 items-center bg-secondary/20 rounded-3xl p-8 border border-border/50">
                    <div className="order-2 md:order-1">
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border/50 shadow-sm">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Logged & Auditable</h4>
                                    <p className="text-sm text-muted-foreground">Every action is recorded with user identity, timestamp, and justification.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border/50 shadow-sm">
                                <Database className="w-6 h-6 text-blue-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Cluster State Sync</h4>
                                    <p className="text-sm text-muted-foreground">Dashboards reflect changes immediately after execution.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 md:order-2 text-center md:text-left">
                        <h3 className="text-2xl font-bold mb-4">Complete Transparency</h3>
                        <p className="text-muted-foreground mb-6">
                            Changes aren't just executed; they are documented. Admins can see the "why" behind every request, and users get feedback on their operations.
                        </p>
                        <div className="inline-flex items-center gap-2 text-primary font-medium">
                            <Activity className="w-5 h-5" />
                            <span>Real-time Visibility for Admins</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
