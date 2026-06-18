import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ChevronsLeft from "lucide-react/dist/esm/icons/chevrons-left";
import ChevronsRight from "lucide-react/dist/esm/icons/chevrons-right";
import { type Table } from "@tanstack/react-table";
import { Tooltip } from "../Tooltip";

import { Button } from "../Button";
import {
    Select,
} from "../Select";

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
}

export function DataTablePagination<TData>({
    table,
}: DataTablePaginationProps<TData>) {
    const pageIndex = table.getState().pagination.pageIndex;
    const pageSize = table.getState().pagination.pageSize;
    const totalRows = table.getRowCount();
    const startRange = totalRows > 0 ? pageIndex * pageSize + 1 : 0;
    const endRange = Math.min((pageIndex + 1) * pageSize, totalRows);

    return (
        <div className="flex items-center justify-between px-2">
            <div className="flex-1 text-sm text-muted-foreground italic">
                {totalRows > 0 ? (
                    <>Showing {startRange} to {endRange} of {totalRows} entries</>
                ) : (
                    <>No entries to show</>
                )}
                {table.getFilteredSelectedRowModel().rows.length > 0 && (
                    <span className="ml-2 not-italic font-medium text-primary">
                        ({table.getFilteredSelectedRowModel().rows.length} row(s) selected)
                    </span>
                )}
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <div className="w-[85px]">
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onChange={(value) => {
                                table.setPageSize(Number(value));
                            }}
                            size="sm"
                            options={[
                                { label: "10", value: "10" },
                                { label: "20", value: "20" },
                                { label: "50", value: "50" },
                            ]}
                        />
                    </div>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount() || 1}
                </div>
                <div className="flex items-center space-x-2">
                    <Tooltip content="First Page">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to first page</span>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Previous Page">
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Next Page">
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                    <Tooltip content="Last Page">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to last page</span>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
