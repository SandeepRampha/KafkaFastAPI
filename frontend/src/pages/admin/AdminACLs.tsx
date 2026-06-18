import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import debounce from "lodash/debounce";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import Shield from "lucide-react/dist/esm/icons/shield";
import Search from "lucide-react/dist/esm/icons/search";
import Plus from "lucide-react/dist/esm/icons/plus";
import Eye from "lucide-react/dist/esm/icons/eye";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Brain from "lucide-react/dist/esm/icons/brain";
import Info from "lucide-react/dist/esm/icons/info";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";

import { ActionButton } from "../../components/ui/ActionButton";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/utils";
import { type ACL, type CreateACLRequest, fetchACLs } from "../../services/adminService";
import { useACLs, aclKeys } from "../../hooks/queries/useACLs";
import { useCreateACL, useDeleteACL } from "../../hooks/mutations/useACLMutations";
import { queryClient } from "../../lib/queryClient";
import { useToast } from "../../contexts/NotificationContext";
import { FilterPopover, type FilterColumn } from "../../components/ui/FilterPopover";
import { useKeyValueFilter } from "../../hooks/useKeyValueFilter";

export default function AdminACLs() {
    const [inputValue, setInputValue] = useState("");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const toast = useToast();

    const { data, isLoading, isFetching, refetch } = useACLs("default", undefined, pageIndex + 1, pageSize, searchQuery);
    const acls = data?.items ?? [];
    const totalCount = data?.total_count ?? 0;

    // Predictive Prefetching
    useEffect(() => {
        if (!data) return;
        const totalPages = Math.ceil(totalCount / pageSize);
        const nextPage = pageIndex + 2;

        if (nextPage <= totalPages) {
            queryClient.prefetchQuery({
                queryKey: aclKeys.list("default", undefined, nextPage, pageSize, searchQuery),
                queryFn: () => fetchACLs("default", undefined, nextPage, pageSize, searchQuery),
                staleTime: 30000,
            });
        }
    }, [data, pageIndex, pageSize, searchQuery, totalCount]);

    const createAclMutation = useCreateACL();

    const handleRefresh = async () => {
        await refetch();
        toast.success("ACLs refreshed successfully");
    };
    const deleteAclMutation = useDeleteACL();

    const [selectedAcl, setSelectedAcl] = useState<ACL | null>(null);
    const [modalType, setModalType] = useState<"add" | "view" | "delete" | "ai" | "none">("none");
    const [aiExplanation, setAiExplanation] = useState<string>("");
    const [tableKey, setTableKey] = useState(0);

    const resetTableState = () => {
        setSearchQuery("");
        setPageIndex(0);
        debouncedSearch.cancel();
        setActiveFilter(undefined);
        setTableKey(prev => prev + 1);
    };

    // Create Form State
    const [newAcl, setNewAcl] = useState<CreateACLRequest>({
        resource_type: "TOPIC",
        resource_name: "",
        principal: "User:",
        operation: "READ",
        permission_type: "ALLOW",
        pattern_type: "LITERAL",
        host: "*",
        cluster: "default"
    });

    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const errors = {
        principal: !newAcl.principal?.trim() ? "Principal is required" : "",
        resource_name: !newAcl.resource_name?.trim() ? "Resource Name is required" : "",
        host: !newAcl.host?.trim() ? "Restricted Host is required" : "",
        operation: !newAcl.operation ? "Operation is required" : "",
        resource_type: !newAcl.resource_type ? "Resource Type is required" : "",
    };

    const isFormValid = !Object.values(errors).some(err => err);

    const handleBlur = (field: keyof typeof errors) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const resetFormState = () => {
        setNewAcl({
            resource_type: "TOPIC",
            resource_name: "",
            principal: "User:",
            operation: "READ",
            permission_type: "ALLOW",
            pattern_type: "LITERAL",
            host: "*",
            cluster: "default"
        });
        setTouched({});
    };

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

    const handleCreateACL = async () => {
        setTouched({
            principal: true,
            resource_name: true,
            host: true,
            operation: true,
            resource_type: true
        });

        if (!isFormValid) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            await createAclMutation.mutateAsync(newAcl);
            toast.success("ACL Rule created successfully");
            setModalType("none");
            resetTableState();
            resetFormState();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to create ACL rule");
        }
    };

    const handleDeleteACL = async () => {
        if (!selectedAcl) return;

        try {
            const aclToDelete: CreateACLRequest = {
                resource_type: selectedAcl.resourceType,
                resource_name: selectedAcl.resourceName,
                principal: selectedAcl.principal,
                operation: selectedAcl.operation,
                permission_type: selectedAcl.permissionType,
                pattern_type: selectedAcl.patternType,
                host: selectedAcl.host,
                cluster: "default"
            };

            await deleteAclMutation.mutateAsync(aclToDelete);
            toast.success("ACL deleted successfully");
            setModalType("none");
            resetTableState();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to delete ACL rule");
        }
    };

    const handleExplainACL = (acl: ACL) => {
        setSelectedAcl(acl);
        const explanation = `This rule ${acl.permissionType.toLowerCase()}s ${acl.principal} to perform ${acl.operation} on the ${acl.resourceType.toLowerCase()} '${acl.resourceName}'. This is a ${acl.patternType.toLowerCase()} pattern applying to host '${acl.host}'.`;
        setAiExplanation(explanation);
        setModalType("ai");
    };

    const isSubmitting = createAclMutation.isPending || deleteAclMutation.isPending;

    // Filter Config
    const filterColumns: FilterColumn[] = [
        {
            key: "resourceType",
            label: "Resource Type",
            type: "select",
            options: [
                { value: "TOPIC", label: "Topic" },
                { value: "GROUP", label: "Group" },
                { value: "CLUSTER", label: "Cluster" },
                { value: "TRANSACTIONAL_ID", label: "Transactional ID" }
            ]
        },
        {
            key: "operation",
            label: "Operation",
            type: "select",
            options: [
                { value: "READ", label: "READ" },
                { value: "WRITE", label: "WRITE" },
                { value: "CREATE", label: "CREATE" },
                { value: "DELETE", label: "DELETE" },
                { value: "ALTER", label: "ALTER" },
                { value: "DESCRIBE", label: "DESCRIBE" },
                { value: "ALL", label: "ALL" }
            ]
        },
        {
            key: "permissionType",
            label: "Permission",
            type: "select",
            options: [
                { value: "ALLOW", label: "ALLOW" },
                { value: "DENY", label: "DENY" }
            ]
        },
        { key: "host", label: "Host", type: "text" }
    ];

    const { filteredData, activeFilter, setActiveFilter } = useKeyValueFilter(acls, filterColumns);

    const filteredAcls = filteredData;

    const columns = useMemo<ColumnDef<ACL>[]>(() => [
        {
            accessorKey: "principal",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            header: ({ column }: any) => (
                <DataTableColumnHeader column={column} title="Principal" />
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cell: ({ row }: any) => (
                <div className="w-[180px]">
                    <span className="font-semibold font-mono text-slate-700 dark:text-slate-200 break-all block" title={row.getValue("principal")}>
                        {row.getValue("principal")}
                    </span>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "resourceType",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            header: ({ column }: any) => (
                <DataTableColumnHeader column={column} title="Resource Type" />
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cell: ({ row }) => (
                <Badge className="font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 rounded-md shadow-none h-auto px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    {row.getValue("resourceType")}
                </Badge>
            ),
            enableSorting: false,
        },
        {
            accessorKey: "resourceName",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            header: ({ column }: any) => (
                <DataTableColumnHeader column={column} title="Resource Name" />
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cell: ({ row }) => (
                <div className="w-[180px]">
                    <div className="font-semibold font-mono text-[13px] text-slate-700 dark:text-slate-200 truncate" title={row.getValue("resourceName")}>
                        {row.getValue("resourceName")}
                    </div>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "operation",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            header: ({ column }: any) => (
                <DataTableColumnHeader column={column} title="Operation" />
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cell: ({ row }: any) => (
                <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold px-2 py-0.5">
                    {row.getValue("operation")}
                </Badge>
            ),
            enableSorting: false,
        },
        {
            accessorKey: "permissionType",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            header: ({ column }: any) => (
                <DataTableColumnHeader column={column} title="Permission" />
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cell: ({ row }) => {
                const permission = row.getValue("permissionType") as string;
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
            accessorKey: "host",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            header: ({ column }: any) => (
                <DataTableColumnHeader column={column} title="Host" />
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cell: ({ row }: any) => (
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[13px] w-[100px] truncate" title={row.getValue("host")}>
                    {row.getValue("host")}
                </div>
            ),
            enableSorting: false,
        },
        {
            id: "actions",
            header: () => <div className="text-center font-bold text-slate-800 dark:text-white tracking-wider text-xs uppercase">ACTIONS</div>,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cell: ({ row }: any) => (
                <div className="flex justify-center gap-2">
                    <ActionButton
                        variant="view"
                        onClick={() => {
                            setSelectedAcl(row.original);
                            setModalType("view");
                        }}
                        title="View Details"
                    />
                    <ActionButton
                        variant="delete"
                        onClick={() => {
                            setSelectedAcl(row.original);
                            setModalType("delete");
                        }}
                        title="Delete Rule"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 text-primary transition-all active:scale-90"
                        title="Explain with AI"
                        onClick={() => handleExplainACL(row.original)}
                    >
                        <Sparkles className="h-4 w-4" />
                    </Button>
                </div>
            ),
        }
    ], [setSelectedAcl, setModalType]);

    return (
        <DashboardLayout role="admin" title="Access Control Lists" description="Manage user permissions and access rights across the cluster.">
            <Card className="glass-panel border-none shadow-sm dark:bg-slate-900 transition-colors duration-300">
                <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
                    <div className="space-y-1.5">
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            Access Control Lists
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">Manage user permissions across types and operations.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-80 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Filter rules..."
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
                            title="Refresh ACLs"
                        >
                            <RefreshCw className={cn("h-4 w-4", (isLoading || isFetching) && "animate-spin")} />
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-white h-10 px-5 rounded-xl transition-all active:scale-95 font-semibold text-sm shadow-sm flex items-center gap-2"
                            onClick={() => setModalType("add")}
                        >
                            <Plus className="h-4 w-4" /> Add Rule
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                    <DataTable
                        key={tableKey}
                        columns={columns}
                        data={filteredAcls}
                        isLoading={isLoading && filteredAcls.length === 0}
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

            {/* Add Rule Modal */}
            <Modal
                isOpen={modalType === "add"}
                onClose={() => {
                    setModalType("none");
                    resetFormState();
                }}
                isSubmitting={isSubmitting}
                title={
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <span>Add New ACL Rule</span>
                    </div>
                }
                className="max-w-2xl"
            >
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Principal Identity *</label>
                        <Input
                            placeholder="e.g. User:alice"
                            className={cn(
                                "h-11 bg-slate-50 dark:bg-slate-900",
                                touched.principal && errors.principal ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                            )}
                            value={newAcl.principal}
                            onChange={(e) => setNewAcl({ ...newAcl, principal: e.target.value })}
                            onBlur={() => handleBlur("principal")}
                        />
                        {touched.principal && errors.principal && <p className="text-sm text-red-500">{errors.principal}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Type *</label>
                            <Select
                                options={[
                                    { value: "TOPIC", label: "Topic" },
                                    { value: "GROUP", label: "Group" },
                                    { value: "CLUSTER", label: "Cluster" },
                                    { value: "TRANSACTIONAL_ID", label: "Transactional ID" }
                                ]}
                                placeholder="Select resource type"
                                className={cn("bg-slate-50 dark:bg-slate-900", touched.resource_type && errors.resource_type ? "border-red-500 ring-1 ring-red-500" : "")}
                                value={newAcl.resource_type}
                                onChange={(val) => { setNewAcl({ ...newAcl, resource_type: val }); handleBlur("resource_type"); }}
                            />
                            {touched.resource_type && errors.resource_type && <p className="text-sm text-red-500">{errors.resource_type}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Name *</label>
                            <Input
                                placeholder="e.g. my-topic or *"
                                className={cn(
                                    "h-11 bg-slate-50 dark:bg-slate-900 font-mono",
                                    touched.resource_name && errors.resource_name ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                                )}
                                value={newAcl.resource_name}
                                onChange={(e) => setNewAcl({ ...newAcl, resource_name: e.target.value })}
                                onBlur={() => handleBlur("resource_name")}
                            />
                            {touched.resource_name && errors.resource_name && <p className="text-sm text-red-500">{errors.resource_name}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Operation *</label>
                            <Select
                                options={[
                                    { value: "READ", label: "READ" },
                                    { value: "WRITE", label: "WRITE" },
                                    { value: "CREATE", label: "CREATE" },
                                    { value: "DELETE", label: "DELETE" },
                                    { value: "ALTER", label: "ALTER" },
                                    { value: "DESCRIBE", label: "DESCRIBE" },
                                    { value: "ALTER_CONFIGS", label: "ALTER_CONFIGS" },
                                    { value: "DESCRIBE_CONFIGS", label: "DESCRIBE_CONFIGS" },
                                    { value: "CLUSTER_ACTION", label: "CLUSTER_ACTION" },
                                    { value: "IDEMPOTENT_WRITE", label: "IDEMPOTENT_WRITE" },
                                    { value: "ALL", label: "ALL" }
                                ]}
                                placeholder="Select operation"
                                className={cn("bg-slate-50 dark:bg-slate-900", touched.operation && errors.operation ? "border-red-500 ring-1 ring-red-500" : "")}
                                dropdownPosition="top"
                                value={newAcl.operation}
                                onChange={(val) => { setNewAcl({ ...newAcl, operation: val }); handleBlur("operation"); }}
                            />
                            {touched.operation && errors.operation && <p className="text-sm text-red-500">{errors.operation}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Restricted Host *</label>
                            <Input
                                placeholder="e.g. *"
                                className={cn(
                                    "h-11 bg-slate-50 dark:bg-slate-900 font-mono",
                                    touched.host && errors.host ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                                )}
                                value={newAcl.host}
                                onChange={(e) => setNewAcl({ ...newAcl, host: e.target.value })}
                                onBlur={() => handleBlur("host")}
                            />
                            {touched.host && errors.host && <p className="text-sm text-red-500">{errors.host}</p>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-8">
                    <Button variant="cancel" onClick={() => { setModalType("none"); resetFormState(); }} disabled={isSubmitting} className="flex-1 h-12 rounded-xl transition-all font-semibold">Cancel</Button>
                    <Button
                        onClick={handleCreateACL}
                        isLoading={isSubmitting}
                        disabled={isSubmitting || !isFormValid}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Adding..." : "Add Rule"}
                    </Button>
                </div>
            </Modal>

            {/* View ACL Modal */}
            <Modal
                isOpen={modalType === "view"}
                onClose={() => setModalType("none")}
                title={
                    <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary" />
                        <span>ACL Details</span>
                    </div>
                }
                className="max-w-2xl"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Principal</label>
                        <Input value={selectedAcl?.principal || ""} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Type</label>
                            <Input value={selectedAcl?.resourceType || ""} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resource Name</label>
                            <Input value={selectedAcl?.resourceName || ""} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pattern Type</label>
                            <Input value={selectedAcl?.patternType || "LITERAL"} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Host</label>
                            <Input value={selectedAcl?.host || ""} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Operation</label>
                            <Input value={selectedAcl?.operation || ""} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Permission Type</label>
                            <Input value={selectedAcl?.permissionType || ""} readOnly className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                        </div>
                    </div>
                </div>
                <Button
                    onClick={() => setModalType("none")}
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-semibold mt-6"
                >
                    Close
                </Button>
            </Modal>

            {/* AI Explanation Modal */}
            <Modal
                isOpen={modalType === "ai"}
                onClose={() => setModalType("none")}
                title={
                    <div className="flex items-center gap-3 text-primary">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Brain className="h-5 w-5" />
                        </div>
                        <span>Security Concept Explainer</span>
                    </div>
                }
                className="max-w-md"
            >
                <div className="space-y-6">
                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <Info className="h-5 w-5 text-primary" />
                            <h4 className="font-black text-xs uppercase tracking-widest text-primary/80">Contextual Analysis</h4>
                        </div>
                        
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/5">
                            <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                                {aiExplanation}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Security Implications</h5>
                            <div className="flex items-center gap-3 p-3 bg-background border border-border/10 rounded-xl hover:border-primary/20 transition-all">
                                <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                                <span className="text-[11px] font-bold">Follows principle of least privilege</span>
                            </div>
                        </div>
                    </div>

                    <Button 
                        onClick={() => setModalType("none")} 
                        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                    >
                        Understood
                    </Button>
                </div>
            </Modal>

            {/* Delete ACL Modal */}
            <Modal
                isOpen={modalType === "delete"}
                onClose={() => setModalType("none")}
                isSubmitting={isSubmitting}
                title={
                    <div className="flex items-center gap-2 text-red-600">
                        <Trash2 className="h-5 w-5" />
                        <span>Delete ACL Rule</span>
                    </div>
                }
                className="max-w-md"
            >
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="space-y-2">
                        <p className="text-lg font-medium text-slate-800 dark:text-white leading-relaxed">
                            Delete ACL for <span className="text-red-600 font-bold break-all">{selectedAcl?.principal}</span>?
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-300 px-4">
                            This will check for a match with Resource: {selectedAcl?.resourceType} {selectedAcl?.resourceName} and Operation: {selectedAcl?.operation}.
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 w-full mt-4">
                        <Button variant="cancel" onClick={() => setModalType("none")} disabled={isSubmitting} className="flex-1 h-12 rounded-xl font-bold transition-all">Cancel</Button>
                        <Button onClick={handleDeleteACL} isLoading={isSubmitting} disabled={isSubmitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl font-bold shadow-lg shadow-red-500/20">
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
