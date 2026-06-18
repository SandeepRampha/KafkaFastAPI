import { cn } from "../../lib/utils";

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-primary/25 dark:bg-muted/100", className)}
            {...props}
        />
    );
}

interface TableSkeletonProps {
    columnCount: number;
    rowCount?: number;
}

function TableSkeleton({ columnCount, rowCount = 5 }: TableSkeletonProps) {
    return (
        <div className="w-full">
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border/10 bg-primary/5 dark:bg-muted/20">
                {Array.from({ length: columnCount }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                ))}
            </div>
            <div className="divide-y divide-border/10">
                {Array.from({ length: rowCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-4">
                        {Array.from({ length: columnCount }).map((_, j) => (
                            <Skeleton key={j} className="h-6 w-full" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface TableRowSkeletonProps {
    columns: number;
}

function TableRowSkeleton({ columns }: TableRowSkeletonProps) {
    return (
        <tr className="border-b border-border/10 transition-colors">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-4 align-middle">
                    <Skeleton className="h-6 w-full" />
                </td>
            ))}
        </tr>
    );
}

export { Skeleton, TableSkeleton, TableRowSkeleton };
