import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import X from "lucide-react/dist/esm/icons/x";
import { Button } from "./Button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    className?: string;
    isSubmitting?: boolean;
}

export function Modal({ isOpen, onClose, title, children, className, isSubmitting }: ModalProps) {


    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={isSubmitting ? undefined : onClose}
                        className={cn(
                            "fixed inset-0 z-[200] bg-slate-950/40 backdrop-blur-[2px]",
                            isSubmitting && "cursor-not-allowed"
                        )}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        role="dialog"
                        aria-modal="true"
                        className={cn(
                            "fixed left-[50%] top-[50%] z-[200] grid w-full translate-x-[-50%] translate-y-[-50%] gap-0 border border-white/20 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-2xl rounded-[2rem] md:w-full outline-none",
                            !className?.includes("max-w-") && "max-w-lg",
                            className
                        )}
                    >
                        <div className="p-8 pb-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                    {title}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="px-8 pb-8">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
