import * as React from "react";
import {
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../../../lib/utils";
import { storage } from "../../../lib/storage";

import { DataTablePagination } from "./DataTablePagination";
import { TableRowSkeleton } from "../Skeleton";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading?: boolean;
    headerClassName?: string;
    // Manual pagination props
    manualPagination?: boolean;
    pageCount?: number;
    rowCount?: number;
    pagination?: {
        pageIndex: number;
        pageSize: number;
    };
    onPaginationChange?: (updater: any) => void;
}

// Persistence key for pageSize
const STORAGE_KEY = "kafka_manager_data_table_page_size";

function DataTableInner<TData, TValue>({
    columns,
    data,
    isLoading = false,
    headerClassName = "bg-slate-50 dark:bg-slate-800",
    manualPagination = false,
    pageCount,
    rowCount,
    pagination: externalPagination,
    onPaginationChange: externalOnPaginationChange,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    );
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const [internalPagination, setInternalPagination] = React.useState(() => {
        const initialSize = storage.getItem<number>(STORAGE_KEY, 10) ?? 10;
        return {
            pageIndex: 0,
            pageSize: initialSize,
        };
    });

    const pagination = externalPagination ?? internalPagination;
    const onPaginationChange = externalOnPaginationChange ?? ((updater: any) => {
        setInternalPagination((prev) => {
            const next = typeof updater === "function" ? updater(prev) : updater;
            if (next.pageSize !== prev.pageSize) {
                storage.setItem(STORAGE_KEY, next.pageSize);
            }
            return next;
        });
    });

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onPaginationChange,
        manualPagination,
        pageCount,
        rowCount,
        autoResetPageIndex: false,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination,
        },
    });

    const { rows } = table.getRowModel();

    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 61, // Average height of a row
        overscan: 10,
    });

    const virtualRows = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();

    const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
    const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div ref={parentRef} className="w-full overflow-auto max-h-[calc(109vh-380px)] relative">
                    <table className="w-full text-sm caption-bottom border-collapse">
                        <thead className={cn(headerClassName, "sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white")}>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="bg-inherit transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <th key={header.id} className="h-12 px-4 text-left align-middle font-semibold text-slate-700 dark:text-slate-200 [&:has([role=checkbox])]:pr-0 bg-inherit">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0 divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRowSkeleton key={i} columns={columns.length} />
                                ))
                            ) : rows.length ? (
                                <>
                                    {paddingTop > 0 && (
                                        <tr>
                                            <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
                                        </tr>
                                    )}
                                    {virtualRows.map((virtualRow) => {
                                        const row = rows[virtualRow.index];
                                        return (
                                            <tr
                                                key={row.id}
                                                data-state={row.getIsSelected() && "selected"}
                                                className="border-b-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 data-[state=selected]:bg-muted"
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <td key={cell.id} className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                    {paddingBottom > 0 && (
                                        <tr>
                                            <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
                                        </tr>
                                    )}
                                </>
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No results.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="pt-2 dark:border-slate-800">
                <DataTablePagination table={table} />
            </div>
        </div>
    );
}

export const DataTable = React.memo(DataTableInner) as <TData, TValue>(
    props: DataTableProps<TData, TValue>
) => React.ReactElement;

