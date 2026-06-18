import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import debounce from "lodash/debounce";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Search from "lucide-react/dist/esm/icons/search";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Shield from "lucide-react/dist/esm/icons/shield";
import { ActionButton } from "../../components/ui/ActionButton";
import { lazy, Suspense } from "react";
const ACLDetailsModal = lazy(() => import("../../components/modals/ACLDetailsModal").then(module => ({ default: module.ACLDetailsModal })));

import { useToast } from "../../contexts/NotificationContext";
import { Select } from "../../components/ui/Select";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/utils";
import { type ACLRequest, fetchACLRequests } from "../../services/adminService";
import { useACLRequests, aclRequestsKeys } from "../../hooks/queries/useACLRequests";
import { useApproveACLRequest, useRejectACLRequest } from "../../hooks/mutations/useACLRequestMutations";
import { FilterPopover, type FilterColumn } from "../../components/ui/FilterPopover";
import { useKeyValueFilter } from "../../hooks/useKeyValueFilter";
import { queryClient } from "../../lib/queryClient";

export default function AdminACLRequests() {
    const [inputValue, setInputValue] = useState("");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const [selectedRequest, setSelectedRequest] = useState<ACLRequest | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const toast = useToast();

    const { data, isLoading, refetch, isFetching } = useACLRequests("default", pageIndex + 1, pageSize, searchQuery);
    
    const requests = data?.items ?? [];
    const totalCount = data?.total_count ?? 0;

    // Predictive Prefetching
    useEffect(() => {
        if (!data) return;
        const totalPages = Math.ceil(totalCount / pageSize);
        const nextPage = pageIndex + 2;

        if (nextPage <= totalPages) {
            queryClient.prefetchQuery({
                queryKey: aclRequestsKeys.list("default", nextPage, pageSize, searchQuery),
                queryFn: () => fetchACLRequests("default", nextPage, pageSize, searchQuery),
                staleTime: 30000,
            });
        }
    }, [data, pageIndex, pageSize, searchQuery, totalCount]);

    const approveMutation = useApproveACLRequest();
    const rejectMutation = useRejectACLRequest();

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

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const handleRefresh = async () => {
        await refetch();
        toast.success("ACL requests refreshed successfully");
    };

    const handleApprove = useCallback(async (id: number) => {
        try {
            await approveMutation.mutateAsync(id);
            toast.success("ACL Request approved successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to approve request");
        }
    }, [approveMutation, toast]);

    const handleReject = useCallback(async (id: number) => {
        try {
            await rejectMutation.mutateAsync(id);
            toast.success("ACL Request rejected successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to reject request");
        }
    }, [rejectMutation, toast]);

    // Filter Config
    const filterColumns: FilterColumn[] = [
        {
            key: "resource_type", label: "Resource Type", type: "select",
            options: [{ value: "TOPIC", label: "Topic" }, { value: "GROUP", label: "Group" }, { value: "CLUSTER", label: "Cluster" }, { value: "TRANSACTIONAL_ID", label: "Transactional ID" }]
        },
        {
            key: "kafka_operation", label: "Operation", type: "select",
            options: [
                { value: "READ", label: "READ" }, { value: "WRITE", label: "WRITE" },
                { value: "CREATE", label: "CREATE" }, { value: "DELETE", label: "DELETE" },
                { value: "ALTER", label: "ALTER" }, { value: "DESCRIBE", label: "DESCRIBE" },
                { value: "ALL", label: "ALL" }
            ]
        },
        {
            key: "request_type", label: "Request Type", type: "select",
            options: [{ value: "Create ACL", label: "Create ACL" }, { value: "Delete ACL", label: "Delete ACL" }]
        },
        {
            key: "pattern_type", label: "Pattern Type", type: "select",
            options: [{ value: "LITERAL", label: "LITERAL" }, { value: "PREFIXED", label: "PREFIXED" }]
        },
        {
            key: "permission_type", label: "Permission", type: "select",
            options: [{ value: "ALLOW", label: "ALLOW" }, { value: "DENY", label: "DENY" }]
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
        }
    ];

    const { filteredData, activeFilter, setActiveFilter } = useKeyValueFilter(requests, filterColumns);
    const filteredRequests = filteredData;

    const columns = useMemo<ColumnDef<ACLRequest>[]>(() => [
        {
            accessorKey: "principal",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Principal" />
            ),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                        {row.original.principal}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium font-mono">
                        ID: {row.original.id}
                    </span>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "resource_type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Resource Type" />
            ),
            cell: ({ row }) => (
                <Badge className="font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 rounded-md shadow-none h-auto px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    {row.getValue("resource_type")}
                </Badge>
            ),
            enableSorting: false,
        },
        {
            accessorKey: "resource_name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Resource Name" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold font-mono text-slate-700 dark:text-slate-200">
                    {row.getValue("resource_name")}
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "kafka_operation",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Operation" />
            ),
            cell: ({ row }) => {
                const method = row.getValue("kafka_operation") as string;
                return (
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md shadow-none">
                        {method}
                    </Badge>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: "request_type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Request Type" />
            ),
            cell: ({ row }) => {
                const type = row.getValue("request_type") as string;
                return (
                    <Badge className={cn(
                        "font-semibold text-[11px] tracking-wide border shadow-none transition-all duration-200",
                        type === "Create ACL"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                    )}>
                        {type}
                    </Badge>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: "pattern_type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Pattern Type" />
            ),
            cell: ({ row }) => (
                <Badge className="font-mono text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/20 px-2 py-0.5 rounded-md shadow-none">
                    {row.original.pattern_type || "LITERAL"}
                </Badge>
            ),
            enableSorting: false,
        },
        {
            accessorKey: "permission_type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Permission" />
            ),
            cell: ({ row }) => {
                const permission = row.getValue("permission_type") as string;
                return (
                    <Badge className={cn(
                        "px-2.5 py-1 rounded-md border text-[11px] font-bold shadow-none flex items-center gap-1.5 w-fit",
                        permission === "ALLOW" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            permission === "ALLOW" ? "bg-emerald-600" : "bg-red-500"
                        )} />
                        {permission}
                    </Badge>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: "status",
            header: ({ column }) => {
                const filterValue = (column.getFilterValue() as string) ?? "all";
                return (
                    <div className="flex">
                        <Select
                            options={[
                                { value: "all", label: "All Status" },
                                { value: "APPROVED", label: "Approved" },
                                { value: "PENDING", label: "Pending" },
                                { value: "DECLINED", label: "Declined" },
                                { value: "REJECTED", label: "Rejected" }
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
                                        Status
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
                const status = row.getValue("status") as string;
                return (
                    <div>
                        <Badge className={cn(
                            "font-semibold flex items-center w-fit gap-1.5 px-2.5 py-0.5 rounded-md shadow-none border",
                            status === "APPROVED" && "bg-green-500/10 text-green-600 border-green-500/20",
                            status === "PENDING" && "bg-orange-500/10 text-orange-600 border-orange-500/20",
                            (status === "DECLINED" || status === "REJECTED") && "bg-red-500/10 text-red-600 border-red-500/20"
                        )}>
                            <div className={cn(
                                "w-1 h-1 rounded-full",
                                status === "APPROVED" && "bg-green-500",
                                status === "PENDING" && "bg-orange-500",
                                (status === "DECLINED" || status === "REJECTED") && "bg-red-500"
                            )} />
                            {status}
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
            id: "actions",
            header: () => <div className="text-center font-bold text-slate-800 dark:text-white tracking-wider text-xs uppercase">ACTIONS</div>,
            cell: ({ row }) => {
                const isProcessingApprove = approveMutation.isPending && approveMutation.variables === row.original.id;
                const isProcessingReject = rejectMutation.isPending && rejectMutation.variables === row.original.id;
                const isAnyProcessing = isProcessingApprove || isProcessingReject;
                const status = row.original.status;

                return (
                    <div className="flex justify-center gap-2 text-left">
                        <ActionButton
                            variant="view"
                            onClick={() => {
                                setSelectedRequest(row.original);
                                setIsViewModalOpen(true);
                            }}
                            title="View Configuration Details"
                        />
                        
                        {status === "PENDING" && (
                            <div className="flex gap-2">
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
                        )}
                        
                        {status !== "PENDING" && (
                            <div className="text-center text-slate-400 text-[11px] font-medium italic flex items-center px-2">
                                Handled
                            </div>
                        )}
                    </div>
                );
            },
        }
    ], [approveMutation.isPending, approveMutation.variables, rejectMutation.isPending, rejectMutation.variables, handleApprove, handleReject]);

    return (
        <DashboardLayout role="admin" title="ACL Requests" description="Review and approve user requests for Access Control Lists.">
            <Card className="glass-panel border-none shadow-sm dark:bg-slate-900 transition-colors duration-300 mb-6">
                <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
                    <div className="space-y-1.5">
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            ACL Requests
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">Review and orchestrated user ACL requests efficiently.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-72 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Filter requests..."
                                className="pl-9 h-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20 transition-all rounded-xl text-sm"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    debouncedSearch(e.target.value);
                                }}
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
                <ACLDetailsModal 
                    isOpen={isViewModalOpen}
                    onClose={() => {
                        setIsViewModalOpen(false);
                        setSelectedRequest(null);
                    }}
                    principal={selectedRequest?.principal}
                    resourceType={selectedRequest?.resource_type}
                    resourceName={selectedRequest?.resource_name}
                    operation={selectedRequest?.kafka_operation}
                    permissionType={selectedRequest?.permission_type}
                    patternType={selectedRequest?.pattern_type}
                    host={selectedRequest?.host}
                />
            </Suspense>
        </DashboardLayout>
    );
}
