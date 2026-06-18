import React from 'react';
import WifiOff from "lucide-react/dist/esm/icons/wifi-off";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import { useBackendError } from '../../contexts/BackendErrorContext';
import { motion } from 'framer-motion';
import { queryClient } from '../../lib/queryClient';
import { resetCircuit } from '../../services/api';

export const ErrorFallback: React.FC = () => {
    const { clearError, errorDetails } = useBackendError();

    const [isRotating, setIsRotating] = React.useState(false);

    const handleRetry = async () => {
        setIsRotating(true);

        try {
            // Reset the circuit breaker in api.ts to allow fresh requests
            resetCircuit();
            // Clear React Query cache so it doesn't just show old data
            queryClient.resetQueries();
        } catch (error) {
            console.error('Failed to reset query cache during retry:', error);
        } finally {
            // Give it a small delay for the animation to look smooth
            setTimeout(() => {
                clearError();
                setIsRotating(false);
            }, 600);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-md p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full glass-panel p-8 rounded-3xl text-center space-y-6 shadow-2xl"
            >
                <div className="flex justify-center">
                    <div className="relative">
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.5, 0.8, 0.5]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl"
                        />
                        <div className="relative bg-destructive/10 p-5 rounded-3xl border border-destructive/20">
                            <WifiOff className="w-12 h-12 text-destructive" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-destructive p-1.5 rounded-full border-4 border-background shadow-lg">
                            <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Unable to reach backend service
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        We're having trouble connecting to our servers. This could be due to a temporary network issue or server maintenance.
                    </p>
                    {errorDetails && (
                        <div className="mt-4 p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                            <p className="text-[10px] font-mono text-destructive/70 break-all leading-tight">
                                {errorDetails}
                            </p>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleRetry}
                        className="group relative w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-semibold rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                    >
                        <motion.div
                            animate={{ rotate: isRotating ? 360 : 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            onAnimationComplete={() => setIsRotating(false)}
                            className="flex items-center justify-center"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </motion.div>
                        Retry Connection
                    </button>
                </div>

                <div className="flex items-center justify-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        <span className="text-[10px] font-medium text-destructive/80 uppercase">Backend Offline</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
