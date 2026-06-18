import { useState, useMemo, useEffect, lazy, Suspense, useTransition, useCallback } from "react";
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
import { Select } from "../../components/ui/Select";
import { ActionButton } from "../../components/ui/ActionButton";
import Plus from "lucide-react/dist/esm/icons/plus";
import Search from "lucide-react/dist/esm/icons/search";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Clock from "lucide-react/dist/esm/icons/clock";
import { useToast } from "../../contexts/NotificationContext";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/utils";
import { type TopicRequestResponse as TopicRequest, fetchTopicRequests } from "../../services/adminService";
import { useTopicRequests, topicRequestKeys } from "../../hooks/queries/useTopicRequests";
import { queryClient } from "../../lib/queryClient";
const CreateTopicModal = lazy(() => import("../../components/modals/CreateTopicModal").then(module => ({ default: module.CreateTopicModal })));
const TopicDetailsModal = lazy(() => import("../../components/modals/TopicDetailsModal").then(module => ({ default: module.TopicDetailsModal })));
import { FilterPopover, type FilterColumn } from "../../components/ui/FilterPopover";
import { useKeyValueFilter } from "../../hooks/useKeyValueFilter";

// Define Request Type (mapped from backend TopicRequest)
type Request = {
  id: string;
  type: string;
  name: string;
  date: string;
  status: string;
  comment: string;
  partitions: string;
  replication: string;
  currentPartitions: string;
  config?: Record<string, string>;
  retentionMs?: string;
  cleanupPolicy?: string;
  minInsyncReplicas?: string;
};

// Helper function to map backend data to UI format
const mapTopicRequestToUI = (req: TopicRequest): Request => {
  const typeMap: { [key: string]: string } = {
    "CREATE": "Create",
    "ALTER": "Alter",
    "DELETE": "Delete"
  };

  const date = new Date(req.created_at).toISOString().split("T")[0];

  const statusMap: { [key: string]: string } = {
    "APPROVED": "Approved",
    "PENDING": "Pending",
    "REJECTED": "Declined"
  };
  const status = statusMap[req.status] || req.status;

  return {
    id: `REQ-${req.id}`,
    type: typeMap[req.operation] || req.operation,
    name: req.topic_name,
    date,
    status,
    comment: req.approved_by || "-",
    partitions: req.num_partitions != null ? req.num_partitions.toString() : "-",
    replication: req.replication_factor != null ? req.replication_factor.toString() : "-",
    currentPartitions: "0", // Backend doesn't provide this for now
    config: req.extra_configs || (req.config as any) || undefined,
    retentionMs: req.retention_ms?.toString() || req.config?.["retention.ms"]?.toString(),
    cleanupPolicy: req.cleanup_policy || req.config?.["cleanup.policy"]?.toString(),
    minInsyncReplicas: req.min_insync_replicas?.toString() || req.config?.["min.insync.replicas"]?.toString(),
  };
};

export default function UserTopicRequests() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const toast = useToast();
  const { data: paginatedData, isLoading, refetch, isFetching: isRefreshing } = useTopicRequests("default", pageIndex + 1, pageSize, searchQuery);

  const totalCount = paginatedData?.total_count ?? 0;

  // Predictive Prefetching
  useEffect(() => {
    if (!paginatedData) return;
    const totalPages = Math.ceil(totalCount / pageSize);
    const nextPage = pageIndex + 2;

    if (nextPage <= totalPages) {
      queryClient.prefetchQuery({
        queryKey: topicRequestKeys.list("default", nextPage, pageSize, searchQuery),
        queryFn: () => fetchTopicRequests("default", nextPage, pageSize, searchQuery),
        staleTime: 30000,
      });
    }
  }, [paginatedData, pageIndex, pageSize, searchQuery, totalCount]);
  
  const data = useMemo(() => {
    const rawRequests = paginatedData?.items ?? [];
    return rawRequests.map(mapTopicRequestToUI);
  }, [paginatedData?.items]);

  const filterColumns: FilterColumn[] = [
    {
      key: "type",
      label: "Request Type",
      type: "select",
      options: [
        { value: "Create", label: "Create" },
        { value: "Alter", label: "Alter" },
        { value: "Delete", label: "Delete" }
      ]
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Approved", label: "Approved" },
        { value: "Pending", label: "Pending" },
        { value: "Declined", label: "Declined" }
      ]
    }
  ];

  const { filteredData: hookedFilteredData, activeFilter, setActiveFilter } = useKeyValueFilter(data, filterColumns);

  const handleRefresh = async () => {
    await refetch();
    toast.success("Topic requests refreshed");
  };

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

  const columns = useMemo<ColumnDef<Request>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Topic Name" />
      ),
      cell: ({ row }) => <div className="font-semibold text-slate-700 dark:text-slate-200">{row.getValue("name")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "type",
      header: "Request Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <span
            className={cn(
              "px-2 py-1 rounded-md border text-xs font-medium",
              type === "Create" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                type === "Delete" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                  type === "Alter" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                    "bg-slate-500/10 text-slate-600 border-slate-500/20"
            )}
          >
            {type}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "partitions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Partitions" />
      ),
      cell: ({ row }) => <div className="font-semibold font-mono text-slate-600 dark:text-slate-400">{row.getValue("partitions")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => <div className="font-mono text-slate-600 dark:text-slate-400">{row.getValue("date")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        const filterValue = column.getFilterValue() as string;
        const isFiltered = filterValue && filterValue !== "All";
        return (
          <div className="flex items-center space-x-2">
            <Select
              value={filterValue ?? "All"}
              onChange={(val) => column.setFilterValue(val === "All" ? undefined : val)}
              options={["All", "Approved", "Pending", "Declined"].map(s => ({ value: s, label: s }))}
              variant="minimal"
              className="w-auto h-auto transition-colors duration-200"
              triggerContent={
                <div className="flex items-center gap-1.5 px-0 group cursor-pointer">
                  <span className={cn(
                    "text-sm font-semibold transition-colors duration-200 text-slate-700 dark:text-slate-200",
                    isFiltered && "text-primary"
                  )}>
                    Status
                  </span>
                  <div className="flex items-center justify-center h-8 w-8 rounded-md group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                    {isFiltered ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </div>
              }
            />
          </div >
        )
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={
              status === "Approved"
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : status === "Pending"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-red-500/10 text-red-500 border-red-500/20"
            }
          >
            {status}
          </Badge>
        );
      },
      enableSorting: false,
      filterFn: (row, id, value) => {
        return value === undefined || value === "All" ? true : row.getValue(id) === value;
      },
    },
    {
      accessorKey: "comment",
      header: "Comments",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const comment = row.getValue("comment") as string;
        return <div className="text-slate-500">{status === "Declined" ? comment : "-"}</div>;
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-center font-bold text-slate-800 dark:text-white tracking-wider text-xs uppercase">ACTIONS</div>,
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <ActionButton
            variant="view"
            onClick={() => {
              setSelectedRequest(row.original);
              setIsViewModalOpen(true);
            }}
          />
        </div>
      ),
    },
  ], []);

  const finalData = hookedFilteredData;

  return (
    <DashboardLayout
      role="user"
      title="Topic Requests"
      description="Manage your Kafka topic resource requests"
    >
      <Card className="glass-panel border-none shadow-sm pb-2 dark:bg-slate-900 transition-colors duration-300 mb-6">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              Topic Requests
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
              Manage your topic operations and history.
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
              disabled={isLoading || isRefreshing}
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all"
            >
              <RefreshCw className={cn("h-4 w-4", (isLoading || isRefreshing) && "animate-spin")} />
            </Button>
            <Button
              onClick={() => setIsNewRequestOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white h-10 px-5 rounded-xl transition-all active:scale-95 font-semibold text-sm shadow-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Topic Request
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
        {isNewRequestOpen && (
          <CreateTopicModal
            isOpen={isNewRequestOpen}
            onClose={() => setIsNewRequestOpen(false)}
            onSuccess={() => refetch()}
            isRequest={true}
          />
        )}
        {isViewModalOpen && (
          <TopicDetailsModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedRequest(null);
            }}
            {...selectedRequest}
          />
        )}
      </Suspense>
    </DashboardLayout>
  );
}