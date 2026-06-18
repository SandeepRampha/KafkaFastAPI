import React from "react";
import Eye from "lucide-react/dist/esm/icons/eye";
import SquarePen from "lucide-react/dist/esm/icons/square-pen";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { type LucideProps } from "lucide-react";
import { Button } from "./Button";
import { Tooltip } from "./Tooltip";
import { cn } from "../../lib/utils";

export type ActionVariant = "view" | "alter" | "delete";

interface ActionButtonProps {
    variant: ActionVariant;
    onClick: () => void;
    onMouseEnter?: () => void;
    title?: string;
    className?: string;
    disabled?: boolean;
}

const variantConfig: Record<ActionVariant, { icon: React.FC<LucideProps>; colorClass: string; tooltip: string }> = {
    view: {
        icon: Eye,
        colorClass: "text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20",
        tooltip: "View Details",
    },
    alter: {
        icon: SquarePen,
        colorClass: "text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",
        tooltip: "Edit / Alter",
    },
    delete: {
        icon: Trash2,
        colorClass: "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20",
        tooltip: "Delete",
    },
};

export const ActionButton = React.memo(({
    variant,
    onClick,
    onMouseEnter,
    title,
    className,
    disabled = false,
}: ActionButtonProps) => {
    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
        <Tooltip content={title || config.tooltip}>
            <Button
                variant="ghost"
                size="icon"
                onMouseEnter={onMouseEnter}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                disabled={disabled}
                className={cn(
                    "h-8 w-8 p-0 rounded-md transition-all duration-200 active:scale-90 flex items-center justify-center",
                    config.colorClass,
                    className
                )}
            >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="sr-only">{title || config.tooltip}</span>
            </Button>
        </Tooltip>
    );
});
