import { useState, useMemo, useEffect, lazy, Suspense, useTransition, useCallback } from "react";
import debounce from "lodash/debounce";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/Card";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { ActionButton } from "../../components/ui/ActionButton";
import Plus from "lucide-react/dist/esm/icons/plus";
import Search from "lucide-react/dist/esm/icons/search";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Lock from "lucide-react/dist/esm/icons/lock";
import Database from "lucide-react/dist/esm/icons/database";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { fetchTopics } from "../../services/adminService";
import governanceService, { GovernanceOperation, GovernanceResourceType } from "../../services/governanceService";
import { useTopics, topicKeys } from "../../hooks/queries/useTopics";
import { useMyRequests } from "../../hooks/queries/useMyRequests";
import { queryClient } from "../../lib/queryClient";
import { useToast } from "../../contexts/NotificationContext";
import { FilterPopover, type FilterColumn } from "../../components/ui/FilterPopover";
import { useKeyValueFilter } from "../../hooks/useKeyValueFilter";
import { GovernanceRulesReadOnly } from "../../components/dq/GovernanceRulesReadOnly";
import { useAuth } from "../../contexts/AuthContext";

// Lazy load heavy components
const CreateTopicModal = lazy(() => import("../../components/modals/CreateTopicModal").then(m => ({ default: m.CreateTopicModal })));
const TopicDetailsModal = lazy(() => import("../../components/modals/TopicDetailsModal").then(m => ({ default: m.TopicDetailsModal })));
const AlterTopicModal = lazy(() => import("../../components/modals/AlterTopicModal").then(m => ({ default: m.AlterTopicModal })));
const DeleteConfirmationModal = lazy(() => import("../../components/modals/DeleteConfirmationModal").then(m => ({ default: m.DeleteConfirmationModal })));

interface Topic {
  name: string;
  partitions: number;
  replication: number;
  status: string;
  cleanupPolicy: string;
  isOwned: boolean;
  isInternal: boolean;
  retentionMs?: string;
  minInsyncReplicas?: string;
  config?: Record<string, string>;
}

export default function UserTopicCatalog() {
  const { user } = useAuth();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<
    "view" | "alter" | "delete" | null
  >(null);

  const { data: topicsData, isLoading: isLoadingTopics, isFetching: isFetchingTopics, refetch: refetchTopics } = useTopics("default", pageIndex + 1, pageSize, searchQuery);
  const totalCount = topicsData?.total_count ?? 0;

  // Predictive Prefetching
  useEffect(() => {
    if (!topicsData) return;
    const totalPages = Math.ceil(totalCount / pageSize);
    const nextPage = pageIndex + 2;

    if (nextPage <= totalPages) {
      queryClient.prefetchQuery({
        queryKey: topicKeys.list("default", nextPage, pageSize, searchQuery),
        queryFn: () => fetchTopics("default", nextPage, pageSize, searchQuery),
        staleTime: 30000,
      });
    }
  }, [topicsData, pageIndex, pageSize, searchQuery, totalCount]);
  const { data: myRequestsData, isLoading: isLoadingRequests, isFetching: isFetchingRequests, refetch: refetchRequests } = useMyRequests("default", 1, 100, undefined, "TOPIC"); // Fetch first 100 TOPIC requests for ownership check

  const isLoading = isLoadingTopics || isLoadingRequests;
  const isRefreshing = isFetchingTopics || isFetchingRequests;

  const toast = useToast();

  const handleRefresh = async () => {
    await Promise.all([refetchTopics(), refetchRequests()]);
    toast.success("Topics refreshed");
  };

  const filterColumns: FilterColumn[] = [

    {
      key: "cleanupPolicy",
      label: "Cleanup Policy",
      type: "select",
      options: [
        { value: "Delete", label: "Delete" },
        { value: "Compact", label: "Compact" }
      ]
    }
  ];

  const transformedTopics = useMemo(() => {
    const rawTopics = topicsData?.items ?? [];
    const myRequests = myRequestsData?.items ?? [];

    // Identify topics owned by the user (Approved or Implemented CREATE requests)
    const ownedTopicNames = new Set(
      myRequests
        .filter((req: any) => 
          // Match TOPIC creations that are live (Approved/Implemented/Provisioned)
          (req.request_type === "TOPIC" || req.resource_type === "TOPIC") && 
          req.operation === "CREATE" && 
          ["APPROVED", "IMPLEMENTED", "PROVISIONED"].includes(req.status?.toUpperCase())
        )
        .map((req: any) => (req.resource_name || req.topic_name)?.toLowerCase().trim())
        .filter(Boolean)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawTopics.map((t: any) => ({
      name: t.name,
      partitions: t.num_partitions,
      replication: t.replication_factor,
      status: "Healthy",
      cleanupPolicy: t.config?.["cleanup.policy"] || "Delete",
      isOwned: ownedTopicNames.has(t.name.toLowerCase().trim()),
      isInternal: t.is_internal,
      retentionMs: t.config?.["retention.ms"] || "604800000",
      minInsyncReplicas: t.config?.["min.insync.replicas"] || "1",
      config: t.config
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [topicsData?.items, myRequestsData?.items]);

  const { filteredData, activeFilter, setActiveFilter } = useKeyValueFilter(transformedTopics, filterColumns);

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


  const filteredTopics = filteredData;

  const columns = useMemo<ColumnDef<Topic>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Topic Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {!row.original.isOwned && !row.original.isInternal && (
            <span title="Read-only Topic">
              <Lock className="h-3 w-3 text-slate-400" />
            </span>
          )}
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            <a
              onClick={() => handleAction(row.original, "view")}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {row.getValue("name")}
            </a>
          </div>
        </div>
      ),
      enableSorting: true,
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
      accessorKey: "replication",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Replication" />
      ),
      cell: ({ row }) => <div className="font-semibold font-mono text-slate-600 dark:text-slate-400">{row.getValue("replication")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "cleanupPolicy",
      header: "Clean-up Policy",
      cell: ({ row }) => {
        const policy = row.getValue("cleanupPolicy") as string;
        return (
          <Badge
            className={
              policy.toLowerCase() === "compact"
                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-semibold hover:bg-orange-500/10"
                : "bg-primary/10 text-primary border-primary/20 font-semibold hover:bg-primary/10"
            }
          >
            {policy}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-center font-bold text-slate-800 dark:text-white tracking-wider text-xs">ACTIONS</div>,
      cell: ({ row }) => {
        const isOwned = row.original.isOwned;
        const isInternal = row.original.isInternal;

        return (
          <div className="flex justify-center gap-2">
            <ActionButton
              variant="view"
              onClick={() => handleAction(row.original, "view")}
            />
            <ActionButton
              variant="alter"
              disabled={!isOwned || isInternal}
              title={isOwned ? "Alter Topic" : "No Permission to Alter"}
              onClick={() => isOwned && !isInternal && handleAction(row.original, "alter")}
            />
            <ActionButton
              variant="delete"
              disabled={!isOwned || isInternal}
              title={isOwned ? "Delete Topic" : "No Permission to Delete"}
              onClick={() => isOwned && !isInternal && handleAction(row.original, "delete")}
            />
          </div>
        );
      },
    },
  ], []);

  const handleAction = (topic: Topic, mode: "view" | "alter" | "delete") => {
    setSelectedTopic(topic);
    setModalMode(mode);
  };

  const handleDeleteTopic = async () => {
    if (selectedTopic) {
      try {
        await governanceService.createRequest({
            resource_type: GovernanceResourceType.TOPIC,
            resource_name: selectedTopic.name,
            operation: GovernanceOperation.DELETE,
            payload: { name: selectedTopic.name },
            cluster_id: "default"
        });
        toast.success(`Deletion request for '${selectedTopic.name}' submitted for review`);
        await handleRefresh();
        setSelectedTopic(null);
        setModalMode(null);
      } catch (error: any) {
        toast.error(error.response?.data?.detail || "Failed to submit deletion request");
        throw error;
      }
    }
  };

  return (
    <DashboardLayout
      title="Topic Catalog"
      description="Browse and manage available topics"
      role={user?.role || "user"}
    >
      <Card className="glass-panel border-none shadow-sm pb-2 dark:bg-slate-900 transition-colors duration-300 mb-6">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Topics
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
              Manage your Kafka topics and configurations.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Find a topic..."
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
              disabled={isLoading || isRefreshing}
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all"
              title="Refresh Topics"
            >
              <RefreshCw className={cn("h-4 w-4", (isLoading || isRefreshing) && "animate-spin")} />
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
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
            data={filteredTopics}
            isLoading={isLoading && filteredTopics.length === 0}
            manualPagination={true}
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

      {/* Governance Rules - Read Only */}
      <GovernanceRulesReadOnly />

      <Suspense fallback={null}>
        {isCreateModalOpen && (
          <CreateTopicModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleRefresh}
            isRequest={true}
          />
        )}

        {modalMode === "view" && selectedTopic && (
          <TopicDetailsModal
            isOpen={modalMode === "view"}
            onClose={() => setModalMode(null)}
            {...selectedTopic}
          />
        )}

        {modalMode === "alter" && selectedTopic && (
          <AlterTopicModal
            isOpen={modalMode === "alter"}
            onClose={() => setModalMode(null)}
            {...selectedTopic}
            onSuccess={handleRefresh}
          />
        )}

        {modalMode === "delete" && selectedTopic && (
          <DeleteConfirmationModal
            isOpen={modalMode === "delete"}
            onClose={() => setModalMode(null)}
            onConfirm={handleDeleteTopic}
            itemName={selectedTopic?.name || ""}
            itemType="Topic"
            description="This action is permanent and cannot be undone. All data in this topic will be destroyed."
          />
        )}
      </Suspense>
    </DashboardLayout>
  );
}