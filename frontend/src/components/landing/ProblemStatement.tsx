import { m } from 'framer-motion';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Eye from 'lucide-react/dist/esm/icons/eye';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import GitPullRequest from 'lucide-react/dist/esm/icons/git-pull-request';

export const ProblemStatement = () => {
    const problems = [
        {
            icon: <AlertTriangle className="w-6 h-6 text-orange-500" />,
            title: "Risky Manual Operations",
            description: "Direct CLI access relies on individual caution, lacking systemic safety checks."
        },
        {
            icon: <Eye className="w-6 h-6 text-blue-500" />,
            title: "Limited Visibility",
            description: "Hard to see who is doing what in real-time without centralized logging."
        },
        {
            icon: <ShieldAlert className="w-6 h-6 text-red-500" />,
            title: "No Audit Trail",
            description: "Changes happen without a clear history of approval or context."
        }
    ];

    return (
        <section className="py-24 bg-muted/30">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4">Why This Tool Exists</h2>
                    <p className="text-lg text-muted-foreground">
                        Managing Kafka clusters today often means struggling with direct CLI access, limited visibility, and risky manual operations.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {problems.map((item, index) => (
                        <m.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="mb-4 p-3 bg-secondary/50 rounded-lg w-fit">
                                {item.icon}
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                            <p className="text-muted-foreground">{item.description}</p>
                        </m.div>
                    ))}
                </div>

                <m.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-center mt-12 bg-primary/5 border border-primary/10 rounded-2xl p-8 max-w-3xl mx-auto"
                >
                    <div className="flex flex-col items-center gap-3">
                        <GitPullRequest className="w-10 h-10 text-primary mb-2" />
                        <p className="text-xl font-medium text-foreground">
                            Kafka Manager introduces a request–approval workflow that keeps clusters safe, observable, and governed.
                        </p>
                    </div>
                </m.div>
            </div>
        </section>
    );
};
