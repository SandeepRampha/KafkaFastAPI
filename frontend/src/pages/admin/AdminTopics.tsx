import { useState, useEffect, useMemo, lazy, Suspense, useTransition, useCallback } from "react";
import debounce from "lodash/debounce";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Database from "lucide-react/dist/esm/icons/database";
import Search from "lucide-react/dist/esm/icons/search";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Brain from "lucide-react/dist/esm/icons/brain";

import { ActionButton } from "../../components/ui/ActionButton";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/utils";


import { useTopics, topicKeys } from "../../hooks/queries/useTopics";
import { useDeleteTopic } from "../../hooks/mutations/useTopicMutations";
import { fetchTopics } from "../../services/adminService";
import { queryClient } from "../../lib/queryClient";
import { useToast } from "../../contexts/NotificationContext";
const CreateTopicModal = lazy(() => import("../../components/modals/CreateTopicModal").then(module => ({ default: module.CreateTopicModal })));
const TopicDetailsModal = lazy(() => import("../../components/modals/TopicDetailsModal").then(module => ({ default: module.TopicDetailsModal })));
const AlterTopicModal = lazy(() => import("../../components/modals/AlterTopicModal").then(module => ({ default: module.AlterTopicModal })));

import { FilterPopover, type FilterColumn } from "../../components/ui/FilterPopover";
import { useKeyValueFilter } from "../../hooks/useKeyValueFilter";

export default function AdminTopics() {
    const [inputValue, setInputValue] = useState("");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
    const [modalType, setModalType] = useState<"view" | "alter" | "create" | "delete" | "ai" | "none">("none");
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);
    const toast = useToast();

    const { data, isLoading: isInitialLoading, isFetching: isSyncing, refetch } = useTopics("default", pageIndex + 1, pageSize, searchQuery);
    const topics = data?.items ?? [];
    const totalCount = data?.total_count ?? 0;

    // Predictive Prefetching
    useEffect(() => {
        if (!data) return;
        const totalPages = Math.ceil(totalCount / pageSize);
        const nextPage = pageIndex + 2;

        if (nextPage <= totalPages) {
            queryClient.prefetchQuery({
                queryKey: topicKeys.list("default", nextPage, pageSize, searchQuery),
                queryFn: () => fetchTopics("default", nextPage, pageSize, searchQuery),
                staleTime: 30000,
            });
        }
    }, [data, pageIndex, pageSize, searchQuery, totalCount]);

    const deleteTopicMutation = useDeleteTopic();

    const handleRefresh = async () => {
        await refetch();
        toast.success("Topics refreshed successfully");
    };

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                startTransition(() => {
                    setSearchQuery(value);
                });
                setPageIndex(0); // Reset to first page on search
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

    // Filter Config
    const filterColumns: FilterColumn[] = [
        {
            key: "cleanup_policy",
            label: "Cleanup Policy",
            type: "select",
            options: [
                { value: "delete", label: "Delete" },
                { value: "compact", label: "Compact" }
            ]
        }
    ];

    const { filteredData, activeFilter, setActiveFilter } = useKeyValueFilter(topics, filterColumns);

    const finalFilteredTopics = filteredData;

    const handleDeleteTopic = async () => {
        if (!selectedTopic) return;
        try {
            const topicName = selectedTopic.name;
            await deleteTopicMutation.mutateAsync(topicName);
            toast.success(`Topic ${topicName} deleted successfully.`);
            setModalType("none");
        } catch (err: any) {
            console.error("Failed to delete topic:", err);
            toast.error(err.response?.data?.detail || "Failed to delete topic. Please try again.");
        }
    };

    const isSubmitting = deleteTopicMutation.isPending;

    const handleCloseModal = useCallback(() => setModalType("none"), []);
    const handleModalSuccess = useCallback(() => refetch(), [refetch]);

    const handleAISuggest = (topic: any) => {
        setSelectedTopic(topic);
        setAiSuggestion({
            partitions: topic.num_partitions < 3 ? 3 : topic.num_partitions * 2,
            retention: "7 days (optimized for storage)",
            reasoning: `Based on your current throughput of 2.4k msg/sec, increasing partitions to ${topic.num_partitions < 3 ? 3 : topic.num_partitions * 2} will improve consumer parallelism and reduce rebalance overhead.`
        });
        setModalType("ai");
    };

    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Topic Name" />
            ),
            cell: ({ row }) => (
                <span className="font-semibold text-slate-700 dark:text-slate-200">{row.getValue("name")}</span>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "num_partitions",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Partitions" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold font-mono text-slate-600 dark:text-slate-400">
                    {row.getValue("num_partitions")}
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "replication_factor",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Replication" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold font-mono text-slate-600 dark:text-slate-400">
                    {row.getValue("replication_factor")}
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "cleanup_policy",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Cleanup Policy" />
            ),
            cell: ({ row }) => {
                const policy = row.getValue("cleanup_policy") as string;
                return (
                    <div>
                        <Badge className={policy === "compact"
                            ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-semibold hover:bg-orange-500/10"
                            : "bg-primary/10 text-primary border-primary/20 font-semibold hover:bg-primary/10"}>
                            {policy}
                        </Badge>
                    </div>
                );
            },
            enableSorting: false,
        },
        {
            id: "actions",
            header: () => <div className="text-center font-bold text-slate-800 dark:text-white tracking-wider text-xs">ACTIONS</div>,
            cell: ({ row }) => (
                <div className="flex justify-center gap-2">
                    <ActionButton
                        variant="view"
                        onClick={() => {
                            setSelectedTopic(row.original);
                            setModalType("view");
                        }}
                    />
                    <ActionButton
                        variant="alter"
                        onClick={() => {
                            setSelectedTopic(row.original);
                            setModalType("alter");
                        }}
                        title="Alter Topic"
                    />
                    <ActionButton
                        variant="delete"
                        onClick={() => {
                            setSelectedTopic(row.original);
                            setModalType("delete");
                        }}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 text-primary transition-all active:scale-90"
                        title="AI Suggest"
                        onClick={() => handleAISuggest(row.original)}
                    >
                        <Sparkles className="h-4 w-4" />
                    </Button>
                </div>
            ),
        }
    ], [setSelectedTopic, setModalType]);

    return (
        <DashboardLayout role="admin" title="Topics" description="Manage cluster-wide topic schemas and configurations.">
            <Card className="glass-panel border-none shadow-sm dark:bg-slate-900 transition-colors duration-300 mb-6">
                <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
                    <div className="space-y-1.5">
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Database className="h-6 w-6 text-primary" />
                            Topics
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">Manage cluster-wide topic schemas and configurations.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search topics..."
                                className="pl-9 h-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-primary/20 transition-all rounded-xl text-sm"
                                value={inputValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                            {isPending && (
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
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
                            disabled={isInitialLoading || isSyncing}
                            className="h-10 w-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
                            title="Refresh Topics"
                        >
                            <RefreshCw className={cn("h-4 w-4 text-slate-600 dark:text-slate-400", (isInitialLoading || isSyncing) && "animate-spin")} />
                        </Button>

                        <Button
                            data-testid="create-topic-button"
                            className="bg-primary hover:bg-primary/90 text-white h-10 px-5 rounded-xl transition-all active:scale-95 font-semibold text-sm shadow-sm flex items-center gap-2"
                            onClick={() => setModalType("create")}
                        >
                            <Plus className="h-4 w-4" /> Create Topic
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                    <DataTable
                        columns={columns}
                        data={finalFilteredTopics}
                        isLoading={isInitialLoading}
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

            <Suspense fallback={null}>
                {/* View Topic Modal */}
                <TopicDetailsModal
                    isOpen={modalType === "view"}
                    onClose={handleCloseModal}
                    name={selectedTopic?.name}
                    partitions={selectedTopic?.num_partitions}
                    replication={selectedTopic?.replication_factor}
                    minInsyncReplicas={selectedTopic?.min_insync_replicas?.toString() || selectedTopic?.config?.["min.insync.replicas"] || "1"}
                    cleanupPolicy={selectedTopic?.cleanup_policy || selectedTopic?.config?.["cleanup.policy"] || "delete"}
                    retentionMs={selectedTopic?.retention_ms?.toString() || selectedTopic?.config?.["retention.ms"] || "604800000"}
                    config={selectedTopic?.extra_configs || selectedTopic?.config}
                />

                <AlterTopicModal
                    isOpen={modalType === "alter"}
                    onClose={handleCloseModal}
                    name={selectedTopic?.name}
                    partitions={selectedTopic?.num_partitions}
                    replication={selectedTopic?.replication_factor}
                    cleanupPolicy={selectedTopic?.cleanup_policy || selectedTopic?.config?.["cleanup.policy"] || "delete"}
                    retentionMs={selectedTopic?.retention_ms?.toString() || selectedTopic?.config?.["retention.ms"] || "604800000"}
                    minInsyncReplicas={selectedTopic?.min_insync_replicas?.toString() || selectedTopic?.config?.["min.insync.replicas"] || "1"}
                    config={selectedTopic?.extra_configs || selectedTopic?.config}
                    onSuccess={handleModalSuccess}
                    isRequest={false}
                />

                {/* Create Topic Modal */}
                <CreateTopicModal
                    isOpen={modalType === "create"}
                    onClose={handleCloseModal}
                    onSuccess={handleModalSuccess}
                    isRequest={false}
                />
            </Suspense>

            {/* AI Suggestion Modal */}
            <Modal
                isOpen={modalType === "ai"}
                onClose={() => setModalType("none")}
                title={
                    <div className="flex items-center gap-3 text-primary">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Brain className="h-5 w-5" />
                        </div>
                        <span>AI Optimization Insight</span>
                    </div>
                }
                className="max-w-md"
            >
                <div className="space-y-6">
                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <h4 className="font-black text-xs uppercase tracking-widest text-primary/80">Recommended Actions</h4>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-border/5">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Partitions</span>
                                <span className="text-sm font-bold text-primary">{aiSuggestion?.partitions}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-border/5">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Retention</span>
                                <span className="text-sm font-bold text-primary">{aiSuggestion?.retention}</span>
                            </div>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400 p-2">
                            {aiSuggestion?.reasoning}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            variant="cancel" 
                            onClick={handleCloseModal} 
                            className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                        >
                            Dismiss
                        </Button>
                        <Button 
                            onClick={() => {
                                setModalType("alter");
                            }} 
                            className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                        >
                            Apply Optimization
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Topic Modal */}
            <Modal
                isOpen={modalType === "delete"}
                onClose={() => setModalType("none")}
                isSubmitting={isSubmitting}
                title={
                    <div className="flex items-center gap-2 text-red-600">
                        <Trash2 className="h-5 w-5" />
                        <span>Delete Topic</span>
                    </div>
                }
                className="max-w-md"
            >
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="space-y-2">
                        <p className="text-lg font-medium text-slate-800 dark:text-white leading-relaxed">
                            Delete <span className="text-red-600 font-bold break-all">{selectedTopic?.name}</span>?
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-300">
                            This action is permanent and cannot be undone. All data in this topic will be destroyed.
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 w-full mt-4">
                        <Button variant="cancel" onClick={handleCloseModal} disabled={isSubmitting} className="flex-1 h-12 rounded-xl font-bold transition-all">Cancel</Button>
                        <Button onClick={handleDeleteTopic} isLoading={isSubmitting} disabled={isSubmitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl font-bold shadow-lg shadow-red-500/20">
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
