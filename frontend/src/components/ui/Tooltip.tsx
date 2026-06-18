import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    delay?: number;
    className?: string; // Appears to be used for the tooltip content styling based on implementation
    triggerClassName?: string; // New prop for the trigger wrapper
    side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({
    children,
    content,
    delay = 200,
    className,
    triggerClassName,
    side = "top"
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;
            
            // Basic positioning logic
            let top = 0;
            let left = 0;
            const gap = 8;

            switch (side) {
                case "top":
                    top = rect.top + scrollY - gap;
                    left = rect.left + scrollX + rect.width / 2;
                    break;
                case "bottom":
                    top = rect.bottom + scrollY + gap;
                    left = rect.left + scrollX + rect.width / 2;
                    break;
                case "left":
                    top = rect.top + scrollY + rect.height / 2;
                    left = rect.left + scrollX - gap;
                    break;
                case "right":
                    top = rect.top + scrollY + rect.height / 2;
                    left = rect.right + scrollX + gap;
                    break;
            }
            
            setPosition({ top, left });
        }
    }, [side]);

    const handleMouseEnter = () => {
        updatePosition();
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    // Update position on scroll or resize when visible
    useEffect(() => {
        if (isVisible) {
            window.addEventListener("scroll", updatePosition, { passive: true });
            window.addEventListener("resize", updatePosition);
            return () => {
                window.removeEventListener("scroll", updatePosition);
                window.removeEventListener("resize", updatePosition);
            };
        }
    }, [isVisible, updatePosition]);

    const initialStyles = {
        top: { opacity: 0, scale: 0.95, y: 4, x: "-50%" },
        bottom: { opacity: 0, scale: 0.95, y: -4, x: "-50%" },
        left: { opacity: 0, scale: 0.95, x: 4, y: "-50%" },
        right: { opacity: 0, scale: 0.95, x: -4, y: "-50%" },
    };

    const animateStyles = {
        top: { opacity: 1, scale: 1, y: "-100%", x: "-50%" },
        bottom: { opacity: 1, scale: 1, y: 0, x: "-50%" },
        left: { opacity: 1, scale: 1, x: "-100%", y: "-50%" },
        right: { opacity: 1, scale: 1, x: 0, y: "-50%" },
    };

    // Arrow positioning based on side
    const arrowClasses = {
        top: "-bottom-1 left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-50",
        bottom: "-top-1 left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-50",
        left: "-right-1 top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-50",
        right: "-left-1 top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-50",
    };

    return (
        <div
            ref={triggerRef}
            className={cn("relative inline-block", triggerClassName)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={initialStyles[side]}
                            animate={animateStyles[side]}
                            exit={initialStyles[side]}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            style={{
                                position: "absolute",
                                top: position.top,
                                left: position.left,
                            }}
                            className={cn(
                                "z-[9999] whitespace-nowrap rounded bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-50 shadow-xl transition-colors dark:bg-slate-50 dark:text-slate-900 pointer-events-none",
                                className
                            )}
                        >
                            {content}
                            <div
                                className={cn(
                                    "absolute border-4 border-transparent",
                                    arrowClasses[side]
                                )}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
