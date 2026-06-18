import { useState, useMemo, useEffect, useCallback, useTransition } from "react";
import { debounce } from "lodash";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import Search from "lucide-react/dist/esm/icons/search";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Shield from "lucide-react/dist/esm/icons/shield";
import { useToast } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/utils";
import { FilterPopover, type FilterColumn } from "../../components/ui/FilterPopover";
import { useKeyValueFilter } from "../../hooks/useKeyValueFilter";

import { useACLRequests, aclRequestsKeys } from "../../hooks/queries/useACLRequests";
import { type ACLRequest, fetchACLRequests } from "../../services/adminService";
import { queryClient } from "../../lib/queryClient";
import { lazy, Suspense } from "react";

// Lazy load CreateACLModal
const CreateACLModal = lazy(() => import("../../components/modals/CreateACLModal").then(m => ({ default: m.CreateACLModal })));

export default function UserACLRequests() {
  const { user } = useAuth();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const { data: paginatedData, isLoading, isFetching, refetch } = useACLRequests("default", pageIndex + 1, pageSize, searchQuery);
  
  const requests = paginatedData?.items ?? [];
  const totalCount = paginatedData?.total_count ?? 0;

  // Predictive Prefetching
  useEffect(() => {
    if (!paginatedData) return;
    const totalPages = Math.ceil(totalCount / pageSize);
    const nextPage = pageIndex + 2;

    if (nextPage <= totalPages) {
      queryClient.prefetchQuery({
        queryKey: aclRequestsKeys.list("default", nextPage, pageSize, searchQuery),
        queryFn: () => fetchACLRequests("default", nextPage, pageSize, searchQuery),
        staleTime: 30000,
      });
    }
  }, [paginatedData, pageIndex, pageSize, searchQuery, totalCount]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        startTransition(() => {
          setSearchQuery(value);
        });
        setPageIndex(0);
      }, 300),
    [],
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

  const columns = useMemo<ColumnDef<ACLRequest>[]>(() => [
    {
      accessorKey: "principal",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Principal" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" />
      ),
      cell: ({ row }) => <div className="font-semibold text-slate-700 dark:text-slate-200">{row.getValue("principal")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "request_type",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Request Type" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" />
      ),
      cell: ({ row }) => {
        const requestType = row.getValue("request_type") as string;
        return (
          <Badge
            className={cn(
              "px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wider uppercase border shadow-none",
              requestType === "Create ACL"
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
            )}
          >
            {requestType}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "kafka_operation",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Operation" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" />
      ),
      cell: ({ row }) => (
        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md shadow-none">
          {row.getValue("kafka_operation")}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "permission_type",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Permission" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" />
      ),
      cell: ({ row }) => {
        const permission = row.getValue("permission_type") as string;
        return (
          <Badge
            className={cn(
              "px-2.5 py-1 rounded-md border text-[11px] font-bold shadow-none flex items-center gap-1.5 w-fit",
              permission === "ALLOW" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
            )}
          >
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
      accessorKey: "resource_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Resource Name" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" />
      ),
      cell: ({ row }) => <div className="font-semibold font-mono text-slate-700 dark:text-slate-200 truncate max-w-[150px]" title={row.getValue("resource_name")}>{row.getValue("resource_name")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "resource_type",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Resource Type" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" />
      ),
      cell: ({ row }) => (
        <Badge className="px-2 py-0.5 rounded-md font-bold bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] shadow-none">
          {row.getValue("resource_type")}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at")).toLocaleDateString();
        return <div className="text-slate-500 dark:text-slate-400 font-semibold font-mono text-[13px]">{date}</div>;
      },
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title="Status" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase();
        return (
          <Badge
            className={cn(
              "px-2.5 py-1 rounded-md border text-[11px] font-bold shadow-none flex items-center gap-1.5 w-fit",
              status === "APPROVED" ? "bg-green-500/10 text-green-600 border-green-500/20" :
                status === "PENDING" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                  "bg-red-500/10 text-red-500 border-red-500/20"
            )}
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              status === "APPROVED" ? "bg-green-600" :
                status === "PENDING" ? "bg-amber-600" :
                  "bg-red-500"
            )} />
            {formattedStatus}
          </Badge>
        );
      },
      enableSorting: false,
    },
  ], []);

  // Filter Config
  const filterColumns: FilterColumn[] = [
    {
      key: "request_type",
      label: "Request Type",
      type: "select",
      options: [
        { value: "Create", label: "Create" },
        { value: "Delete", label: "Delete" }
      ]
    },
    {
      key: "kafka_operation",
      label: "Operation",
      type: "select",
      options: [
        { value: "All", label: "All" },
        { value: "Read", label: "Read" },
        { value: "Write", label: "Write" },
        { value: "Create", label: "Create" },
        { value: "Delete", label: "Delete" },
        { value: "Alter", label: "Alter" },
        { value: "Describe", label: "Describe" },
        { value: "ClusterAction", label: "ClusterAction" },
        { value: "DescribeConfigs", label: "DescribeConfigs" },
        { value: "AlterConfigs", label: "AlterConfigs" },
        { value: "IdempotentWrite", label: "IdempotentWrite" }
      ]
    },
    {
      key: "permission_type",
      label: "Permission",
      type: "select",
      options: [
        { value: "Allow", label: "Allow" },
        { value: "Deny", label: "Deny" }
      ]
    },
    {
      key: "resource_type",
      label: "Resource Type",
      type: "select",
      options: [
        { value: "Topic", label: "Topic" },
        { value: "Group", label: "Group" },
        { value: "Cluster", label: "Cluster" },
        { value: "TransactionalId", label: "TransactionalId" }
      ]
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "APPROVED", label: "Approved" },
        { value: "PENDING", label: "Pending" },
        { value: "REJECTED", label: "Rejected" }
      ]
    }
  ];

  const { filteredData: hookedFilteredData, activeFilter, setActiveFilter } = useKeyValueFilter(requests, filterColumns);

  // Filter Logic
  const finalData = hookedFilteredData;

  return (
    <DashboardLayout
      role={user?.role || "user"}
      title="ACL Requests"
      description="Manage your access control list operations"
    >
      <Card className="glass-panel border-none shadow-sm pb-2 dark:bg-slate-900 transition-colors duration-300 mb-6">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              ACL Requests
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
              Manage your access control list operations and history.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Filter requests..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                className="pl-9 h-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20 transition-all rounded-xl text-sm"
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
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all"
            >
              <RefreshCw className={cn("h-4 w-4", (isLoading || isFetching) && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={finalData}
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
        {isCreateModalOpen && (
          <CreateACLModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => refetch()}
          />
        )}
      </Suspense>
    </DashboardLayout>
  );
}