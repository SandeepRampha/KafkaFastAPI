import { motion, AnimatePresence } from "framer-motion";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Info from "lucide-react/dist/esm/icons/info";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import { cn } from "../../lib/utils";
import { useEffect } from "react";

interface ToastProps {
    message: string;
    description?: string;
    type?: "success" | "error" | "info" | "warning";
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export function Toast({
    message,
    description,
    type = "success",
    isVisible,
    onClose,
    duration = 3000
}: ToastProps) {

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const icons = {
        success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
        error: <XCircle className="h-5 w-5 text-red-500" />,
        info: <Info className="h-5 w-5 text-blue-400" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-500" />
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={cn(
                        "fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border",
                        "bg-[#1e293b] border-slate-700 text-slate-50", // Dark slate theme matching the screenshot
                        "min-w-[300px]"
                    )}
                >
                    <div className="shrink-0">
                        {icons[type]}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm leading-none tracking-tight">
                            {message}
                        </span>
                        {description && (
                            <span className="text-xs text-slate-400 mt-1 leading-snug">
                                {description}
                            </span>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Example usage imports for parent components
// import { Toast } from "../../components/ui/Toast";
