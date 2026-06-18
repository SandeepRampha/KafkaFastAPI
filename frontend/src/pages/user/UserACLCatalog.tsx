import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ActionButton } from "../../components/ui/ActionButton";
import Search from "lucide-react/dist/esm/icons/search";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Shield from "lucide-react/dist/esm/icons/shield";
import { Modal } from "../../components/ui/Modal";
import { useState, useMemo, useEffect, lazy, Suspense, useCallback, useTransition } from "react";
import debounce from "lodash/debounce";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/utils";
import { storage } from "../../lib/storage";
import { type ACL, fetchACLs } from "../../services/adminService";
import { useACLs, aclKeys } from "../../hooks/queries/useACLs";
import { useDeleteACL } from "../../hooks/mutations/useACLMutations";
import governanceService, { GovernanceOperation, GovernanceResourceType } from "../../services/governanceService";
import { queryClient } from "../../lib/queryClient";
import { FilterPopover, type FilterColumn } from "../../components/ui/FilterPopover";
import { useKeyValueFilter } from "../../hooks/useKeyValueFilter";
import { useToast } from "../../contexts/NotificationContext";
import { useAuth } from "../../contexts/AuthContext";

// Lazy load modals
const ACLDetailsModal = lazy(() => import("../../components/modals/ACLDetailsModal").then(m => ({ default: m.ACLDetailsModal })));
const GovernanceRequestModal = lazy(() => import("../../components/modals/GovernanceRequestModal").then(m => ({ default: m.GovernanceRequestModal })));

export default function UserACLCatalog() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedACL, setSelectedACL] = useState<ACL | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [aclToDelete, setAclToDelete] = useState<ACL | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const { user } = useAuth();

  const username = storage.getItem<string>("username");
  const principal = username ? `User:${username}` : undefined;

  const { data, isLoading, refetch, isFetching: isRefreshing } = useACLs("default", principal, pageIndex + 1, pageSize, searchQuery);
  const totalCount = data?.total_count ?? 0;

  // Predictive Prefetching
  useEffect(() => {
    if (!data) return;
    const totalPages = Math.ceil(totalCount / pageSize);
    const nextPage = pageIndex + 2;

    if (nextPage <= totalPages) {
      queryClient.prefetchQuery({
        queryKey: aclKeys.list("default", principal, nextPage, pageSize, searchQuery),
        queryFn: () => fetchACLs("default", principal, nextPage, pageSize, searchQuery),
        staleTime: 30000,
      });
    }
  }, [data, pageIndex, pageSize, searchQuery, totalCount, principal]);
  const deleteMutation = useDeleteACL();

  const acls = useMemo(() => {
    const rawAcls = data?.items ?? [];
    return [...rawAcls].sort((a, b) =>
      a.resourceName.localeCompare(b.resourceName) || a.principal.localeCompare(b.principal)
    );
  }, [data?.items]);

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

  // Filter Config
  const filterColumns: FilterColumn[] = [
    {
      key: "resourceType",
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
      key: "operation",
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
      key: "permissionType",
      label: "Permission",
      type: "select",
      options: [
        { value: "Allow", label: "Allow" },
        { value: "Deny", label: "Deny" }
      ]
    }
  ];

  const { filteredData, activeFilter, setActiveFilter } = useKeyValueFilter(acls, filterColumns);

  const filteredACLs = filteredData;

  const handleRefresh = async () => {
    await refetch();
    toast.success("ACLs refreshed");
  };

  const columns = useMemo<ColumnDef<ACL>[]>(() => [
    {
      accessorKey: "principal",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Principal" />
      ),
      cell: ({ row }) => <div className="font-semibold text-slate-700 dark:text-slate-200">{row.getValue("principal")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "resourceType",
      header: "Resource Type",
      cell: ({ row }) => (
        <Badge className="font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 rounded-md shadow-none h-auto px-2 py-0.5 text-[11px]">
          {row.getValue("resourceType")}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "resourceName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Resource Name" />
      ),
      cell: ({ row }) => <div className="font-semibold font-mono text-slate-700 dark:text-slate-200">{row.getValue("resourceName")}</div>,
      enableSorting: true,
    },
    {
      accessorKey: "operation",
      header: "Operation",
      cell: ({ row }) => (
        <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold px-2 py-0.5">
          {row.getValue("operation")}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "permissionType",
      header: "Permission",
      cell: ({ row }) => {
        const permission = row.getValue("permissionType") as string;
        return (
          <Badge
            className={cn(
              "font-semibold rounded-md border shadow-none",
              permission === "ALLOW"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
            )}
          >
            {permission}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <div className="text-center font-bold text-slate-800 dark:text-white tracking-wider text-xs uppercase">ACTIONS</div>,
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <ActionButton
            variant="delete"
            title="Request ACL Deletion"
            onClick={() => handleDeleteRequest(row.original)}
          />
        </div>
      ),
    },
  ], []);


  const handleDeleteRequest = (acl: ACL) => {
    setAclToDelete(acl);
  };

  const handleConfirmDelete = async () => {
    if (!aclToDelete) return;

    try {
      await governanceService.createRequest({
        resource_type: GovernanceResourceType.ACL,
        resource_name: aclToDelete.resourceName,
        operation: GovernanceOperation.DELETE,
        payload: {
          resource_type: aclToDelete.resourceType.toUpperCase(),
          resource_name: aclToDelete.resourceName,
          principal: aclToDelete.principal,
          operation: aclToDelete.operation,
          permission_type: aclToDelete.permissionType.toUpperCase(),
          cluster: "default",
          pattern_type: aclToDelete.patternType?.toUpperCase(),
          host: aclToDelete.host
        },
        cluster_id: "default"
      });

      toast.success("Delete request submitted for review");
      setAclToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to submit delete request");
    }
  };

  const isDeleting = deleteMutation.isPending;

  return (
    <DashboardLayout
      role={user?.role || "user"}
      title="ACL"
      description="View access control lists for your principal"
    >
      <Card className="glass-panel border-none shadow-sm dark:bg-slate-900 transition-colors duration-300">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Access Control Lists
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
              View access control lists for your identity.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Filter ACLs..."
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
              title="Refresh ACLs"
            >
              <RefreshCw className={cn("h-4 w-4", (isLoading || isRefreshing) && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredACLs}
            isLoading={isLoading && filteredACLs.length === 0}
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
        {isCreateModalOpen && (
          <GovernanceRequestModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => refetch()}
          />
        )}
        {selectedACL && (
          <ACLDetailsModal
            isOpen={!!selectedACL}
            onClose={() => setSelectedACL(null)}
            {...selectedACL}
          />
        )}
      </Suspense>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!aclToDelete}
        onClose={() => setAclToDelete(null)}
        isSubmitting={isDeleting}
        title="Confirm ACL Deletion Request"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to request deletion of this ACL?
          </p>

          {aclToDelete && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Principal:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{aclToDelete.principal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Resource:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{aclToDelete.resourceType}:{aclToDelete.resourceName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Operation:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{aclToDelete.operation}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Permission:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{aclToDelete.permissionType}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
            ⚠️ This will submit a deletion request that requires admin approval. You will not be able to use this ACL until it is approved and deleted.
          </p>

          <div className="flex gap-3 mt-6">
            <Button
              variant="cancel"
              onClick={() => setAclToDelete(null)}
              disabled={isDeleting}
              className="flex-1 h-11 rounded-xl transition-all font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white h-11 rounded-xl font-semibold shadow-sm"
            >
              {isDeleting ? "Submitting..." : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}