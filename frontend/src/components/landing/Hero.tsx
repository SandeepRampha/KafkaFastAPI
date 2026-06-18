import { useState } from 'react';
import { m } from 'framer-motion';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Activity from 'lucide-react/dist/esm/icons/activity';
import { Link } from 'react-router-dom';
import { RequestDemoModal } from '../modals/RequestDemoModal';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';

export const Hero = () => {
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background">
            <div className="absolute top-8 right-8 z-50">
                <ThemeToggle />
            </div>
            {/* Background Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] bg-blue-500/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
            </div>

            <div className="container mx-auto px-4 z-10 text-center">
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-sm font-medium">Open Source Tool v1.0</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Kafka Manager
                    </h1>

                    <h2 className="text-2xl md:text-3xl font-semibold text-muted-foreground mb-8 text-primary/90">
                        Real-time Kafka Management
                    </h2>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
                        A secure, approval-based platform for managing Kafka clusters with full visibility and control.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/login"
                            className="group relative px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-primary/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Link>

                        <Button
                            variant="outline"
                            className="px-8 py-4 h-auto text-base font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => setIsDemoModalOpen(true)}
                        >
                            Request a Personalized Demo
                        </Button>
                    </div>

                    <div className="mt-16 flex flex-wrap justify-center gap-8 text-muted-foreground/60">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            <span>Secure Operations</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            <span>Real-time Monitoring</span>
                        </div>
                    </div>
                </m.div>
            </div>

            <RequestDemoModal
                isOpen={isDemoModalOpen}
                onClose={() => setIsDemoModalOpen(false)}
            />
        </section>
    );
};
