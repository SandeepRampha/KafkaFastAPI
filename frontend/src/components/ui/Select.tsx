import * as React from "react";
import { createPortal } from "react-dom";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Check from "lucide-react/dist/esm/icons/check";
import { cn } from "../../lib/utils";

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps {
    options: SelectOption[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    label?: string;
    size?: "default" | "sm";
    variant?: "default" | "ghost" | "minimal";
    showPlaceholderWhenSelected?: string;
    dropdownPosition?: 'top' | 'bottom' | 'auto';
    triggerContent?: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Select...",
    className,
    disabled,
    label,
    size = "default",
    variant = "default",
    showPlaceholderWhenSelected,
    dropdownPosition = 'auto',
    triggerContent
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(value || "");
    const [position, setPosition] = React.useState<'bottom' | 'top'>('bottom');

    const isControlled = value !== undefined;
    const selectedValue = isControlled ? value : internalValue;

    const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === selectedValue);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("resize", () => setIsOpen(false));

            // Only close on window scroll, not internal scroll
            const onScroll = (e: Event) => {
                if (dropdownRef.current?.contains(e.target as Node)) {
                    return;
                }
                setIsOpen(false);
            };
            window.addEventListener("scroll", onScroll, { capture: true, passive: true });

            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
                window.removeEventListener("resize", () => setIsOpen(false));
                window.removeEventListener("scroll", onScroll, { capture: true });
            };
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        if (!isControlled) {
            setInternalValue(optionValue);
        }
        onChange?.(optionValue);
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (disabled) return;

        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });

            if (dropdownPosition !== 'auto') {
                setPosition(dropdownPosition);
            } else {
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;

                if (spaceBelow < 250 && spaceAbove > spaceBelow) {
                    setPosition('top');
                    setCoords({
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                        width: rect.width
                    });
                } else {
                    setPosition('bottom');
                }
            }
        }

        setIsOpen(!isOpen);
    };

    const dropdownMenu = (
        <div
            ref={dropdownRef}
            data-select-portal="true"
            className={cn(
                "fixed z-[9999] rounded-xl border-2 border-primary/10 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                position === 'bottom' ? "mt-1 origin-top" : "mb-1 origin-bottom"
            )}
            style={{
                top: position === 'bottom' ? coords.top : 'auto',
                bottom: position === 'top' ? (window.innerHeight - (coords.top - window.scrollY)) + 4 : 'auto',
                left: coords.left,
                width: Math.max(coords.width, 180),
            }}
        >
            <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted flex flex-col gap-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                            "w-full text-left transition-colors flex items-center justify-between rounded-lg group shrink-0",
                            "hover:bg-primary/5 hover:text-primary",
                            size === "default" ? "px-3 py-2.5 text-sm" : "px-2 py-1.5 text-xs",
                            selectedValue === option.value
                                ? "bg-primary/15 text-primary font-bold"
                                : "text-foreground/80 font-medium"
                        )}
                    >
                        <span>{option.label}</span>
                        {selectedValue === option.value && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="relative w-full">
            {label && (
                <label className="text-sm font-semibold text-foreground/90 mb-1.5 block">
                    {label}
                </label>
            )}
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                disabled={disabled}
                className={cn(
                    "flex w-full items-center justify-between rounded-xl border transition-all",
                    "text-sm font-medium",
                    "focus:outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    size === "default" ? "h-11 px-4" : "h-9 px-2.5 text-xs text-foreground/90 font-bold",
                    variant === "default"
                        ? "border-input bg-background/50 hover:bg-muted/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                        : variant === "ghost"
                            ? "border-transparent hover:bg-muted/30 hover:text-foreground/80"
                            : "h-auto px-0 bg-transparent border-none hover:bg-transparent",
                    isOpen && variant === "default" && "border-primary ring-2 ring-primary/10",
                    isOpen && variant === "ghost" && "bg-transparent text-primary font-bold",
                    className
                )}
            >
                {triggerContent ? (
                    triggerContent
                ) : (
                    <>
                        <span className={cn(
                            "truncate",
                            (!selectedOption || (showPlaceholderWhenSelected && selectedValue === showPlaceholderWhenSelected)) && "text-muted-foreground"
                        )}>
                            {(showPlaceholderWhenSelected && selectedValue === showPlaceholderWhenSelected)
                                ? placeholder
                                : (selectedOption ? selectedOption.label : placeholder)}
                        </span>
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ml-2" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ml-2" />
                        )}
                    </>
                )}
            </button>

            {isOpen && createPortal(dropdownMenu, document.body)}
        </div>
    );
};

Select.displayName = "Select";

export { Select };
