import { useState, useEffect, useMemo, lazy, Suspense, useTransition, useCallback } from "react";
import debounce from "lodash/debounce";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Clock from "lucide-react/dist/esm/icons/clock";
import Search from "lucide-react/dist/esm/icons/search";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

import { useToast } from "../../contexts/NotificationContext";
import { Select } from "../../components/ui/Select";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/utils";

import { type TopicRequestResponse as TopicRequest, fetchTopicRequests } from "../../services/adminService";
import { useTopicRequests, topicRequestKeys } from "../../hooks/queries/useTopicRequests";
import { useApproveTopicRequest, useRejectTopicRequest } from "../../hooks/mutations/useTopicRequestMutations";
import { FilterPopover, type FilterColumn } from "../../components/ui/FilterPopover";
const TopicDetailsModal = lazy(() => import("../../components/modals/TopicDetailsModal").then(module => ({ default: module.TopicDetailsModal })));
import { useKeyValueFilter } from "../../hooks/useKeyValueFilter";
import { ActionButton } from "../../components/ui/ActionButton";
import { queryClient } from "../../lib/queryClient";

export default function AdminTopicRequests() {
    const [inputValue, setInputValue] = useState("");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const toast = useToast();

    const { data, isLoading, refetch, isFetching } = useTopicRequests("default", pageIndex + 1, pageSize, searchQuery);

    const requests = data?.items ?? [];
    const totalCount = data?.total_count ?? 0;

    // Predictive Prefetching
    useEffect(() => {
        if (!data) return;
        const totalPages = Math.ceil(totalCount / pageSize);
        const nextPage = pageIndex + 2;

        if (nextPage <= totalPages) {
            queryClient.prefetchQuery({
                queryKey: topicRequestKeys.list("default", nextPage, pageSize, searchQuery),
                queryFn: () => fetchTopicRequests("default", nextPage, pageSize, searchQuery),
                staleTime: 30000,
            });
        }
    }, [data, pageIndex, pageSize, searchQuery, totalCount]);

    const approveMutation = useApproveTopicRequest();
    const rejectMutation = useRejectTopicRequest();

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                startTransition(() => {
                    setSearchQuery(value);
                });
                setPageIndex(0);
            }, 300),
        []
    );

    const onSearchChange = (value: string) => {
        setInputValue(value);
        debouncedSearch(value);
    };

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const [selectedRequest, setSelectedRequest] = useState<TopicRequest | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const handleRefresh = async () => {
        await refetch();
        toast.success("Topic requests refreshed successfully");
    };

    const handleApprove = useCallback(async (id: number) => {
        try {
            await approveMutation.mutateAsync(id);
            toast.success("Topic request approved successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to approve topic request");
        }
    }, [approveMutation, toast]);

    const handleReject = useCallback(async (id: number) => {
        try {
            await rejectMutation.mutateAsync(id);
            toast.success("Topic request rejected successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to reject topic request");
        }
    }, [rejectMutation, toast]);

    // Filter Config
    const filterColumns: FilterColumn[] = [
        {
            key: "operation",
            label: "Request Type",
            type: "select",
            options: [
                { value: "CREATE", label: "Create" },
                { value: "ALTER", label: "Alter" },
                { value: "DELETE", label: "Delete" }
            ]
        },
        {
            key: "status",
            label: "Status",
            type: "select",
            options: [
                { value: "APPROVED", label: "Approved" },
                { value: "PENDING", label: "Pending" },
                { value: "DECLINED", label: "Declined" },
                { value: "REJECTED", label: "Rejected" }
            ]
        },
        {
            key: "cleanup_policy",
            label: "Cleanup Policy",
            type: "select",
            options: [
                { value: "delete", label: "Delete" },
                { value: "compact", label: "Compact" }
            ],
            accessor: (item: TopicRequest) => item.cleanup_policy || item.config?.["cleanup.policy"]
        }
    ];

    const { filteredData, activeFilter, setActiveFilter } = useKeyValueFilter(requests, filterColumns);

    const filteredRequests = filteredData;

    const columns = useMemo<ColumnDef<TopicRequest>[]>(() => [
        {
            accessorKey: "username",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="User" />
            ),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                        {row.original.username}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium font-mono">
                        ID: {row.original.id}
                    </span>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "operation",
            header: ({ column }) => {
                const filterValue = (column.getFilterValue() as string) ?? "all";
                return (
                    <div className="flex">
                        <Select
                            options={[
                                { value: "all", label: "All Types" },
                                { value: "CREATE", label: "Create Topic" },
                                { value: "ALTER", label: "Alter Topic" },
                                { value: "DELETE", label: "Delete Topic" }
                            ]}
                            value={filterValue}
                            onChange={(val) => column.setFilterValue(val === "all" ? undefined : val)}
                            size="sm"
                            variant="minimal"
                            triggerContent={
                                <div className="flex items-center gap-1.5 px-0 group cursor-pointer">
                                    <span className={cn(
                                        "text-sm font-semibold transition-colors duration-200 text-slate-700 dark:text-slate-200",
                                        filterValue !== "all" && "text-primary"
                                    )}>
                                        Request Type
                                    </span>
                                    <div className="flex items-center justify-center h-8 w-8 rounded-md group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                                        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-colors", filterValue !== "all" && "text-primary")} />
                                    </div>
                                </div>
                            }
                        />
                    </div>
                );
            },
            cell: ({ row }) => {
                const op = row.getValue("operation") as string;
                return (
                    <div>
                        <Badge className={cn(
                            "font-semibold rounded-md border shadow-none transition-all duration-200",
                            op === "CREATE" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                            op === "ALTER" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            op === "DELETE" && "bg-red-500/10 text-red-600 border-red-500/20"
                        )}>
                            {op}
                        </Badge>
                    </div>
                );
            },
            enableSorting: true,
            filterFn: (row, id, value) => {
                return value === undefined || value === "all" ? true : row.getValue(id) === value;
            },
        },
        {
            accessorKey: "topic_name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Topic Name" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold font-mono text-slate-700 dark:text-slate-200">
                    {row.getValue("topic_name")}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                return (
                    <div>
                        <Badge className={cn(
                            "font-bold flex items-center w-fit gap-1.5 px-2.5 py-0.5 rounded-md shadow-none border",
                            status === "APPROVED" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            status === "PENDING" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            (status === "DECLINED" || status === "REJECTED") && "bg-red-500/10 text-red-600 border-red-500/20"
                        )}>
                            {status === "APPROVED" && <CheckCircle className="w-3.5 h-3.5" />}
                            {status === "PENDING" && <Clock className="w-3.5 h-3.5" />}
                            {(status === "DECLINED" || status === "REJECTED") && <XCircle className="w-3.5 h-3.5" />}
                            {status}
                        </Badge>
                    </div>
                );
            },
            enableSorting: true,
        },
        {
            id: "actions",
            header: () => <div className="text-center font-bold text-slate-800 dark:text-white tracking-wider text-xs uppercase">ACTIONS</div>,
            cell: ({ row }) => {
                const isProcessingApprove = approveMutation.isPending && approveMutation.variables === row.original.id;
                const isProcessingReject = rejectMutation.isPending && rejectMutation.variables === row.original.id;
                const isAnyProcessing = isProcessingApprove || isProcessingReject;
                const status = row.original.status;

                if (status !== "PENDING") {
                    return <div className="text-center text-slate-400 text-[11px] font-medium italic">Handled</div>;
                }

                return (
                    <div className="flex justify-center gap-2">
                        <ActionButton
                            variant="view"
                            onClick={() => {
                                setSelectedRequest(row.original);
                                setIsViewModalOpen(true);
                            }}
                            title="View Configuration Details"
                        />
                        <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white dark:bg-blue-500 dark:hover:bg-blue-600 h-8 px-4 rounded-lg font-medium text-[12px] shadow-sm transition-colors"
                            onClick={() => handleApprove(row.original.id)}
                            disabled={isAnyProcessing}
                        >
                            {isProcessingApprove ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg font-medium text-[12px] transition-colors border border-red-200/50 dark:border-transparent"
                            onClick={() => handleReject(row.original.id)}
                            disabled={isAnyProcessing}
                        >
                            {isProcessingReject ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Decline
                        </Button>
                    </div>
                );
            },
        }
    ], [approveMutation.isPending, approveMutation.variables, rejectMutation.isPending, rejectMutation.variables, handleApprove, handleReject]);

    return (
        <DashboardLayout role="admin" title="Topic Requests" description="Review and approve user requests for resources.">
            <Card className="glass-panel border-none shadow-sm dark:bg-slate-900 transition-colors duration-300 mb-6">
                <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
                    <div className="space-y-1.5">
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Clock className="h-6 w-6 text-amber-500" />
                            Topic Requests
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">Review and orchestrated user requests efficiently.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-72 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Filter requests..."
                                className="pl-9 h-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20 transition-all rounded-xl text-sm"
                                value={inputValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                            {isPending && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary/60" />
                                </div>
                            )}
                        </div>
                        <FilterPopover
                            columns={filterColumns}
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isLoading || isFetching}
                            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-none"
                            title="Refresh Requests"
                        >
                            <RefreshCw className={cn("h-4 w-4", (isLoading || isFetching) && "animate-spin")} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                    <DataTable
                        columns={columns}
                        data={filteredRequests}
                        isLoading={isLoading}
                        manualPagination
                        rowCount={totalCount}
                        pageCount={Math.ceil(totalCount / pageSize)}
                        pagination={{ pageIndex, pageSize }}
                        onPaginationChange={useCallback((updater: any) => {
                            const next = typeof updater === "function"
                                ? updater({ pageIndex, pageSize })
                                : updater;
                            setPageIndex(next.pageIndex);
                            setPageSize(next.pageSize);
                        }, [pageIndex, pageSize])}
                    />
                </CardContent>
            </Card>

            <Suspense fallback={null}>
                {/* View Topic Request Details Modal */}
                <TopicDetailsModal
                    isOpen={isViewModalOpen}
                    onClose={() => {
                        setIsViewModalOpen(false);
                        setSelectedRequest(null);
                    }}
                    request={selectedRequest}
                />
            </Suspense>
        </DashboardLayout>
    );
}
