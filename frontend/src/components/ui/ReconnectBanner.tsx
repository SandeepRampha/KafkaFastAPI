import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import WifiOff from "lucide-react/dist/esm/icons/wifi-off";
import { useConnectivity } from '../../contexts/NetworkContext';
import { cn } from '../../lib/utils';

export const ReconnectBanner: React.FC = () => {
    const { status } = useConnectivity();
    const isVisible = status === 'offline' || status === 'reconnecting';

    // Lock body scroll when overlay is visible
    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isVisible]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-6 select-none"
                >
                    {/* Minimalist Backdrop with subtle blur */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/10 dark:bg-slate-950/40 backdrop-blur-[2px] pointer-events-auto" 
                    />

                    {/* Minimalist Centered Pill */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 10 }}
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                        className={cn(
                            "relative z-10 flex items-center gap-4 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border transition-all duration-700",
                            status === 'offline' 
                                ? "bg-white dark:bg-slate-900 border-red-500/20 shadow-red-500/5" 
                                : "bg-white dark:bg-slate-900 border-primary/20 shadow-primary/5"
                        )}
                    >
                        {/* Status Icon with subtle animation */}
                        <div className="relative flex items-center justify-center">
                            <motion.div
                                animate={status === 'reconnecting' ? { rotate: 360 } : {}}
                                transition={status === 'reconnecting' ? { duration: 3, repeat: Infinity, ease: "linear" } : {}}
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500",
                                    status === 'offline' 
                                        ? "bg-red-50 dark:bg-red-500/10 text-red-500" 
                                        : "bg-primary/5 dark:bg-primary/10 text-primary"
                                )}
                            >
                                {status === 'offline' ? (
                                    <WifiOff className="w-5 h-5" />
                                ) : (
                                    <RefreshCw className="w-5 h-5" />
                                )}
                            </motion.div>
                            
                            {/* Subtle Radial Glow */}
                            <div className={cn(
                                "absolute inset-0 rounded-xl blur-lg opacity-40 transition-colors duration-500",
                                status === 'offline' ? "bg-red-500" : "bg-primary"
                            )} />
                        </div>

                        <div className="flex flex-col pr-2">
                            <h4 className={cn(
                                "text-sm font-bold tracking-tight",
                                status === 'offline' ? "text-red-600 dark:text-red-400" : "text-primary dark:text-primary/90"
                            )}>
                                {status === 'offline' ? "Network Interrupted" : "Restoring Connection"}
                            </h4>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {status === 'offline' 
                                    ? "Waiting for connection to resume..." 
                                    : "Synchronizing data with cluster..."}
                            </p>
                        </div>

                        {/* Minimalist Status Dot */}
                        <div className="pl-2 border-l border-slate-100 dark:border-slate-800">
                             <motion.div 
                                className={cn(
                                    "w-2 h-2 rounded-full",
                                    status === 'offline' ? "bg-red-500" : "bg-primary"
                                )}
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                             />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
