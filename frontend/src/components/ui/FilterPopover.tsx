import { useState, useRef, useEffect } from "react";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal";
import { motion, AnimatePresence } from "framer-motion";
import { Select } from "./Select";
import { Input } from "./Input";
import { cn } from "../../lib/utils";

export type FilterType = "text" | "number" | "select";

// Helper type to match the hook's structure
export interface FilterColumn {
    key: string;
    label: string;
    type: FilterType;
    options?: { value: string; label: string }[];
    accessor?: (item: any) => any;
}

export interface ActiveFilter {
    key: string;
    value: string;
}

interface FilterPopoverProps {
    columns: FilterColumn[];
    onFilterChange: (filter: ActiveFilter | null) => void;
    activeFilter?: ActiveFilter | null;
}

export function FilterPopover({ columns, onFilterChange, activeFilter }: FilterPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Local state for the selected column when no filter is active.
    const [localColumnKey, setLocalColumnKey] = useState<string>(columns[0]?.key || "");

    // Derive active values directly from props immediately during render
    const selectedColumnKey = activeFilter ? activeFilter.key : localColumnKey;
    const filterValue = activeFilter ? activeFilter.value : "";

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (
                triggerRef.current &&
                !triggerRef.current.contains(target as Node) &&
                popoverRef.current &&
                !popoverRef.current.contains(target as Node) &&
                !target.closest('[data-select-portal="true"]')
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Close on ESC
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEsc);
        }
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen]);


    // Real-time update wrapped in valid check
    const updateFilter = (newKey: string, newValue: string) => {
        setLocalColumnKey(newKey);
        
        if (newValue) {
            onFilterChange({ key: newKey, value: newValue });
        } else {
            onFilterChange(null);
        }
    };

    const selectedColumn = columns.find((c) => c.key === selectedColumnKey) || columns[0];

    const handleClear = () => {
        onFilterChange(null);
    };

    return (
        <div className="relative inline-block text-left">
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all shadow-sm border",
                    isOpen
                        ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 hover:bg-primary"
                        : "bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground dark:hover:bg-slate-800"
                )}
            >
                <SlidersHorizontal className="h-4 w-4" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "absolute right-0 z-50 mt-2 w-[500px] origin-top-right rounded-2xl",
                            "bg-card text-card-foreground shadow-xl border border-border",
                            "dark:bg-slate-900 dark:border-slate-700", // Specific dark mode override as requested
                            "p-4"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                                Filter Row
                            </span>
                            <button
                                onClick={handleClear}
                                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                                CLEAR ALL
                            </button>
                        </div>

                        {/* Filter Row */}
                        <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-xl border border-border/50">
                            {/* Column Select - Wider */}
                            <div className="w-[240px] shrink-0">
                                <Select
                                    value={selectedColumnKey}
                                    onChange={(val) => {
                                        setLocalColumnKey(val);
                                        onFilterChange(null);
                                    }}
                                    options={columns.map(c => ({ label: c.label, value: c.key }))}
                                    className="w-full bg-background dark:bg-slate-950"
                                />
                            </div>

                            <div className="text-muted-foreground font-medium">=</div>

                            {/* Value Input - Dynamic */}
                            <div className="flex-1 min-w-0">
                                {selectedColumn?.type === 'select' ? (
                                    <Select
                                        value={filterValue}
                                        onChange={(val) => updateFilter(selectedColumnKey, val)}
                                        options={selectedColumn.options || []}
                                        placeholder="Select..."
                                        className="w-full bg-background dark:bg-slate-950"
                                    />
                                ) : (
                                    <Input
                                        type={selectedColumn?.type === 'number' ? 'number' : 'text'}
                                        value={filterValue}
                                        onChange={(e) => updateFilter(selectedColumnKey, e.target.value)}
                                        placeholder="Value..."
                                        className="w-full h-11 bg-background dark:bg-slate-950"
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
