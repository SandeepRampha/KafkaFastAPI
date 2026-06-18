import { useState } from 'react';
import { Link } from 'react-router-dom';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import Presentation from 'lucide-react/dist/esm/icons/presentation';
import { RequestDemoModal } from '../modals/RequestDemoModal';

export const GettingStarted = () => {
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

    return (
        <section className="py-24 bg-card border-t border-border/50">
            <div className="container mx-auto px-4 max-w-4xl text-center">
                <h2 className="text-3xl font-bold mb-12">Getting Started is Simple</h2>

                <div className="grid md:grid-cols-3 gap-8 items-center relative">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold border border-primary/20">1</div>
                        <h3 className="font-semibold mb-2">Login with SSO</h3>
                        <p className="text-sm text-muted-foreground">Use your corporate credentials to sign in securely.</p>
                    </div>

                    <div className="absolute top-8 left-[16%] right-[16%] h-0.5 bg-border -z-0 hidden md:block"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold border border-primary/20">2</div>
                        <h3 className="font-semibold mb-2">Select Your Role</h3>
                        <p className="text-sm text-muted-foreground">Dashboard automatically adapts to your permissions.</p>
                    </div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold border border-primary/20">3</div>
                        <h3 className="font-semibold mb-2">Start Managing</h3>
                        <p className="text-sm text-muted-foreground">Submit requests or review pending items instantly.</p>
                    </div>
                </div>

                <div className="mt-16 flex flex-col items-center gap-6">
                    <div>
                        <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg">
                            <LogIn className="w-5 h-5" />
                            Login to Console
                        </Link>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Need access? <a href="#" className="text-primary hover:underline">Request permissions via IT Support</a>
                        </p>
                    </div>

                    <div className="w-full max-w-sm border-t border-border/40 pt-6 mt-2">
                        <p className="text-sm text-muted-foreground mb-3">Want to see it in action first?</p>
                        <button
                            onClick={() => setIsDemoModalOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-secondary/50 text-secondary-foreground text-sm font-medium rounded-md hover:bg-secondary transition-colors border border-border"
                        >
                            <Presentation className="w-4 h-4" />
                            Request a Personalized Demo
                        </button>
                    </div>
                </div>
            </div>

            <RequestDemoModal
                isOpen={isDemoModalOpen}
                onClose={() => setIsDemoModalOpen(false)}
            />
        </section>
    );
};
