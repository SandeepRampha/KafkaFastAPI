import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";

interface ConfigDiffHighlightProps {
    value: string | number;
    oldValue?: string | number;
    isModified: boolean;
}

export function ConfigDiffHighlight({ value, oldValue, isModified }: ConfigDiffHighlightProps) {
    // If not modified, return standard styles
    if (!isModified) {
        return (
            <div className={cn(
                "text-sm font-medium",
                "h-12 px-4 border transition-all",
                "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center text-slate-900 dark:text-slate-100"
            )}>
                {value}
            </div>
        );
    }

    // If we reach here, isModified is true.
    // Define the content with highlighting styles.
    const content = (
        <div className={cn(
            "text-sm font-medium",
            "h-12 px-4 border transition-all",
            "border-amber-500/40 bg-amber-500/[0.02] dark:bg-amber-500/5 shadow-sm rounded-lg flex items-center justify-between",
            "text-amber-900 dark:text-amber-100"
        )}>
            {value}
        </div>
    );

    // If it's a change (has an old value), show tooltip
    if (oldValue !== undefined) {
        return (
            <Tooltip 
                content={`Previous Value: ${oldValue}`} 
                side="top"
                triggerClassName="w-full"
            >
                {content}
            </Tooltip>
        );
    }

    // If it's a new config (no old value, but isModified is true), just show the highlight
    return <div className="w-full">{content}</div>;
}
