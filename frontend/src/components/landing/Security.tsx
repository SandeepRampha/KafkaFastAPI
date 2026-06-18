import Lock from 'lucide-react/dist/esm/icons/lock';
import FileSignature from 'lucide-react/dist/esm/icons/file-signature';
import Shield from 'lucide-react/dist/esm/icons/shield';

export const Security = () => {
    return (
        <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
            <div className="container mx-auto px-4 text-center">
                <div className="mb-12">
                    <span className="text-blue-400 font-semibold tracking-wider uppercase text-sm mb-2 block">Security & Governance</span>
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Safer Than CLI</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                        Kafka Manager removes the risk of direct cluster access by enforcing a strict approval workflow for all critical operations.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm">
                        <Lock className="w-10 h-10 text-blue-400 mb-6 mx-auto" />
                        <h3 className="text-xl font-bold mb-3">No Direct Access</h3>
                        <p className="text-slate-400">
                            Users interact with the dashboard, not the cluster directly. Prevent accidental commands and unauthorized access.
                        </p>
                    </div>
                    <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm">
                        <Shield className="w-10 h-10 text-indigo-400 mb-6 mx-auto" />
                        <h3 className="text-xl font-bold mb-3">Role-Based Control</h3>
                        <p className="text-slate-400">
                            Strict separation between Requestors and Approvers. Only authorized Admins can greenlight changes.
                        </p>
                    </div>
                    <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm">
                        <FileSignature className="w-10 h-10 text-teal-400 mb-6 mx-auto" />
                        <h3 className="text-xl font-bold mb-3">Audit History</h3>
                        <p className="text-slate-400">
                            Every request, approval, and rejection is logged. Easily track who changed what and when.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};
