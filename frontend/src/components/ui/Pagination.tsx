import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ChevronsLeft from "lucide-react/dist/esm/icons/chevrons-left";
import ChevronsRight from "lucide-react/dist/esm/icons/chevrons-right";
import { Button } from "./Button";
import { Select } from "./Select";
import { cn } from "../../lib/utils";
import { Tooltip } from "./Tooltip";

interface PaginationProps {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
    className?: string;
    showRowsPerPage?: boolean;
}

export function Pagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    onRowsPerPageChange,
    className,
    showRowsPerPage = true,
}: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const handleRowsChange = (value: string) => {
        onRowsPerPageChange(Number(value));
        onPageChange(1); // Reset to first page when changing rows per page
    };

    return (
        <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 py-4 w-full", className)}>
            {/* Left Side: Entry Info */}
            <div className="text-sm text-muted-foreground italic">
                Showing <span className="font-medium text-foreground not-italic">{startItem}</span> to <span className="font-medium text-foreground not-italic">{endItem}</span> of <span className="font-medium text-foreground not-italic">{totalItems}</span> entries
            </div>

            {/* Right Side: Controls */}
            <div className="flex items-center gap-2 sm:gap-6">
                {/* Rows Per Page */}
                {showRowsPerPage && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground/80 whitespace-nowrap">Rows per page</span>
                        <Select
                            value={itemsPerPage.toString()}
                            onChange={handleRowsChange}
                            options={[
                                { value: "10", label: "10" },
                                { value: "20", label: "20" },
                                { value: "50", label: "50" },
                                { value: "100", label: "100" },
                            ]}
                            size="sm"
                            variant="default"
                            className="w-[85px]"
                        />
                    </div>
                )}

                {/* Page Info */}
                <div className="text-sm font-medium whitespace-nowrap">
                    Page {currentPage} of {totalPages}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-1">
                    <Tooltip content="First Page">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => onPageChange(1)}
                            disabled={currentPage <= 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Previous Page">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Next Page">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Last Page">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage >= totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
