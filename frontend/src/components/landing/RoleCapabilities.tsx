import { m } from 'framer-motion';
import User from 'lucide-react/dist/esm/icons/user';
import Shield from 'lucide-react/dist/esm/icons/shield';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';

export const RoleCapabilities = () => {
    return (
        <section className="py-24 bg-card">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4">Tailored Experiences</h2>
                    <p className="text-muted-foreground">Dedicated workspaces for Requestors and Approvers.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* User Dashboard */}
                    <m.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-background border border-border/50 rounded-2xl p-8 hover:border-primary/50 transition-colors shadow-sm"
                    >
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center mb-6">
                            <User className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">User Dashboard</h3>
                        <p className="text-sm text-muted-foreground mb-6">For Developers & Data Engineers</p>

                        <ul className="space-y-4">
                            {[
                                "Request Topic creation / updates",
                                "Request ACL changes",
                                "View request status & history",
                                "Read admin comments",
                                "Track approval progress"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-blue-500/60 shrink-0" />
                                    <span className="text-foreground/80">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </m.div>

                    {/* Admin Dashboard */}
                    <m.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-slate-900 text-slate-50 border border-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />

                        <div className="w-12 h-12 bg-primary/20 text-primary rounded-lg flex items-center justify-center mb-6 relative z-10">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2 relative z-10">Admin Dashboard</h3>
                        <p className="text-sm text-slate-400 mb-6 relative z-10">For Platform Administrators</p>

                        <ul className="space-y-4 relative z-10">
                            {[
                                "Full cluster visibility",
                                "Approve or decline requests",
                                "Comment on decisions",
                                "Monitor Topics & ACLs",
                                "Audit trail of operations"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                                    <span className="text-slate-200">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </m.div>
                </div>
            </div>
        </section>
    );
};
