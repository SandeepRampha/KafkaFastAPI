import ArrowDown from "lucide-react/dist/esm/icons/arrow-down";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up";
import ChevronsUpDown from "lucide-react/dist/esm/icons/chevrons-up-down";
import { type Column } from "@tanstack/react-table";

import { cn } from "../../../lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>;
    title: string;
}

export function DataTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) {
    if (!column.getCanSort()) {
        return <div className={cn(className)}>{title}</div>;
    }

    return (
        <div
            className={cn(
                "flex items-center space-x-2 select-none group w-fit cursor-pointer",
                className
            )}
            onClick={() => column.toggleSorting()}
        >
            <span className={cn(
                "text-sm font-semibold text-slate-700 dark:text-slate-200",
                column.getIsSorted() && "text-primary"
            )}>
                {title}
            </span>
            <div className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {column.getIsSorted() === "desc" ? (
                    <ArrowDown className="h-4 w-4 text-primary" />
                ) : column.getIsSorted() === "asc" ? (
                    <ArrowUp className="h-4 w-4 text-primary" />
                ) : (
                    <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                )}
            </div>
        </div>
    );
}
