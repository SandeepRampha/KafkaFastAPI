import { m } from 'framer-motion';
import Check from 'lucide-react/dist/esm/icons/check';
import Code from 'lucide-react/dist/esm/icons/code';
import Database from 'lucide-react/dist/esm/icons/database';
import Search from 'lucide-react/dist/esm/icons/search';

export const Features = () => {
    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-16 max-w-6xl mx-auto">

                    {/* Current Features */}
                    <div>
                        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-green-500 text-sm font-bold">1</span>
                            Current Capabilities
                        </h3>
                        <div className="space-y-6">
                            {[
                                { label: "Topic Management (CRUD)", desc: "Create, Read, Update, Delete topics with validation" },
                                { label: "ACL Management", desc: "Granular access control management" },
                                { label: "Request–Approval Workflow", desc: "Governance gate for all changes" },
                                { label: "Admin Comments & Logs", desc: "Communication and audit history" },
                                { label: "Cluster Visualization", desc: "See what's happening in real-time" }
                            ].map((feat, i) => (
                                <m.div
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={i}
                                    className="flex gap-4 p-4 rounded-xl bg-card border border-border/50 shadow-sm"
                                >
                                    <Check className="w-6 h-6 text-green-500 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">{feat.label}</h4>
                                        <p className="text-sm text-muted-foreground">{feat.desc}</p>
                                    </div>
                                </m.div>
                            ))}
                        </div>
                    </div>

                    {/* Coming Soon */}
                    <div>
                        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-muted-foreground/80">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 text-sm font-bold">2</span>
                            Roadmap / Coming Soon
                        </h3>
                        <div className="space-y-6 relative">
                            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border -z-10 border-l border-dashed border-muted-foreground/30"></div>

                            {[
                                { label: "Schema Registry Management", icon: Code, color: "text-blue-500" },
                                { label: "Enhanced Cluster Metrics", icon: Database, color: "text-purple-500" },
                                { label: "Advanced Search & Filters", icon: Search, color: "text-orange-500" }
                            ].map((feat, i) => (
                                <m.div
                                    initial={{ opacity: 0, x: 10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={i}
                                    className="flex items-center gap-4 p-4"
                                >
                                    <div className={`p-2 rounded-lg bg-background border border-border shadow-sm z-10 ${feat.color}`}>
                                        <feat.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-muted-foreground">{feat.label}</h4>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">Planned</span>
                                    </div>
                                </m.div>
                            ))}

                            <div className="mt-8 p-6 bg-secondary/30 rounded-xl border border-dashed border-border text-center">
                                <p className="text-sm text-muted-foreground italic">
                                    "We are actively working on Schema Registry support. Expect updates in v1.1"
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
