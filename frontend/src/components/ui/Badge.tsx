import { type HTMLAttributes, forwardRef, memo } from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const Badge = memo(forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = "default", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    {
                        "border-transparent bg-primary text-primary-foreground shadow": variant === "default",
                        "border-transparent bg-secondary text-secondary-foreground": variant === "secondary",
                        "border-transparent bg-destructive text-destructive-foreground shadow": variant === "destructive",
                        "text-foreground": variant === "outline",
                        "border-transparent bg-green-500/15 text-green-500": variant === "success",
                        "border-transparent bg-yellow-500/15 text-yellow-500": variant === "warning",
                    },
                    className
                )}
                {...props}
            />
        );
    }
));
Badge.displayName = "Badge";

export { Badge };
