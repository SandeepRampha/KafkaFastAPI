import { useState, useMemo, useEffect, useCallback } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { DataTable } from "../../components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "../../components/ui/data-table/DataTableColumnHeader";
import { type ColumnDef } from "@tanstack/react-table";
import { 
  Shield, 
  Plus, 
  Search, 
  RefreshCw, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Zap,
  MoreHorizontal
} from "lucide-react";
import { ActionButton } from "../../components/ui/ActionButton";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/NotificationContext";
import governanceService, { 
  GovernanceStatus, 
  GovernanceResourceType,
  GovernanceOperation
} from "../../services/governanceService";
import type { GovernanceRequest } from "../../services/governanceService";
import { GovernancePipeline } from "../../components/governance/GovernancePipeline";
import { AutoImplementToggle } from "../../components/governance/AutoImplementToggle";
import { cn } from "../../lib/utils";
import { GovernanceReviewModal } from "../../components/modals/GovernanceReviewModal";
import { GovernanceRequestModal } from "../../components/modals/GovernanceRequestModal";
import { lazy, Suspense } from "react";

const TopicDetailsModal = lazy(() => import("../../components/modals/TopicDetailsModal").then(m => ({ default: m.TopicDetailsModal })));
const ACLDetailsModal = lazy(() => import("../../components/modals/ACLDetailsModal").then(m => ({ default: m.ACLDetailsModal })));

export default function GovernanceRegistry() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "admin";
  const isSteward = user?.role === "data_steward";

  const [requests, setRequests] = useState<GovernanceRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<GovernanceRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isTopicDetailsOpen, setIsTopicDetailsOpen] = useState(false);
  const [isACLDetailsOpen, setIsACLDetailsOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await governanceService.fetchRequests({ 
        page, 
        page_size: pageSize 
      });
      setRequests(data.items);
      setTotalCount(data.total_count);
    } catch (error) {
      toast.error("Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'implement') => {
      try {
          if (action === 'approve') await governanceService.approveRequest(id);
          else if (action === 'reject') await governanceService.rejectRequest(id, "Rejected by Steward");
          else if (action === 'implement') await governanceService.implementRequest(id);
          
          toast.success(`Request ${action}ed successfully`);
          fetchRequests();
      } catch (error: any) {
          toast.error(`Action failed`, error.response?.data?.detail);
      }
  };

  const columns = useMemo<ColumnDef<GovernanceRequest>[]>(() => [
    {
      accessorKey: "resource_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Resource" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
            {row.original.resource_type === GovernanceResourceType.TOPIC ? (
                <div className="p-2 bg-blue-500/10 rounded-xl"><FileText className="h-4 w-4 text-blue-500" /></div>
            ) : (
                <div className="p-2 bg-violet-500/10 rounded-xl"><Shield className="h-4 w-4 text-violet-500" /></div>
            )}
            <div className="flex flex-col">
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight">
                    {row.original.resource_name}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                    {row.original.resource_type}
                </span>
            </div>
        </div>
      )
    },
    {
      accessorKey: "operation",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Operation" />,
      cell: ({ row }) => {
        const op = row.original.operation;
        return (
          <Badge className={cn(
            "font-black text-[10px] px-2 py-0.5 border shadow-none",
            op === GovernanceOperation.CREATE ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
            op === GovernanceOperation.ALTER ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
            "bg-red-500/10 text-red-500 border-red-500/20"
          )}>
            {op}
          </Badge>
        );
      }
    },
    {
       accessorKey: "status",
       header: ({ column }) => <DataTableColumnHeader column={column} title="Stage / Status" />,
       cell: ({ row }) => (
         <div className="min-w-[360px]">
            <GovernancePipeline status={row.original.status} className="py-2 h-auto" />
         </div>
       )
    },
    {
      accessorKey: "created_by",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Requester" />,
      cell: ({ row }) => (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{row.original.created_by}</span>
      )
    },
    {
      id: "actions",
      header: () => <div className="text-center font-bold text-slate-800 dark:text-white tracking-widest text-[10px] uppercase">Actions</div>,
      cell: ({ row }) => {
        const req = row.original;
        
        // Separation of Duties (Admin can also approve/reject for direct actions)
        const canApprove = (isSteward || isAdmin) && req.status === GovernanceStatus.REQUESTED;
        // Admin ONLY Implements
        const canImplement = isAdmin && req.status === GovernanceStatus.APPROVED;

        return (
          <div className="flex justify-center gap-2">
            <ActionButton 
                variant="view"
                onClick={() => { 
                    setSelectedRequest(req); 
                    if (req.resource_type === GovernanceResourceType.TOPIC) {
                        setIsTopicDetailsOpen(true);
                    } else if (req.resource_type === GovernanceResourceType.ACL) {
                        setIsACLDetailsOpen(true);
                    } else {
                        setIsReviewModalOpen(true); 
                    }
                }}
                title="View Technical Specification"
            />

            {req.status === GovernanceStatus.IMPLEMENTED ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] px-2">
                    <CheckCircle2 className="h-4 w-4" /> Provisioned
                </div>
            ) : (
                <>
                    {canApprove && (
                      <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            className="h-8 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
                            onClick={() => handleAction(req.id, 'approve')}
                        >
                            Approve
                        </Button>
                        <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-8 px-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-xs font-bold"
                            onClick={() => handleAction(req.id, 'reject')}
                        >
                            Reject
                        </Button>
                      </div>
                    )}
                    {canImplement && (
                       <Button 
                            size="sm" 
                            className="h-8 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold gap-2"
                            onClick={() => handleAction(req.id, 'implement')}
                       >
                         <Zap className="h-3.5 w-3.5" /> Implement
                       </Button>
                    )}
                </>
            )}
          </div>
        );
      }
    }
  ], [isAdmin, isSteward, fetchRequests]);

  return (
    <DashboardLayout role={user?.role || "user"}>
      <div className="space-y-8 pb-12">
        {/* Header Hero Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-[1.5rem] flex-shrink-0 animate-in zoom-in-50 duration-500">
                  <Shield className="h-8 w-8 text-primary" />
              </div>
              {(isAdmin || isSteward) ? "Governance Hub" : "My Requests"}
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl">
               {(isAdmin || isSteward) 
                ? "Enterprise-grade lifecycle management for Kafka resources." 
                : "Track and verify the status of your Kafka resource requests."}
            </p>
          </div>
          
          {isAdmin && <AutoImplementToggle />}
        </div>

        {/* Stats Summary Card (User specific or Global) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
                { label: "Pending Review", val: requests.filter(r => r.status === GovernanceStatus.REQUESTED).length, icon: Clock, color: "text-amber-500" },
                { label: "Approved Plans", val: requests.filter(r => r.status === GovernanceStatus.APPROVED).length, icon: CheckCircle2, color: "text-blue-500" },
                { label: "Active Deployments", val: requests.filter(r => r.status === GovernanceStatus.IMPLEMENTED).length, icon: Zap, color: "text-emerald-500" },
                { label: "Rejected / Failed", val: requests.filter(r => r.status === GovernanceStatus.REJECTED || r.status === GovernanceStatus.IMPLEMENTATION_FAILED).length, icon: XCircle, color: "text-red-500" },
            ].map((stat, i) => (
                <Card key={i} className="glass-card bg-white dark:bg-slate-900/50 border-none rounded-[2rem] shadow-sm overflow-hidden">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{stat.val}</h3>
                        </div>
                        <div className={cn("p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50", stat.color)}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-4">
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Search resources, users..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 pl-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-primary/20 transition-all shadow-sm"
                />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <Button 
                    variant="outline" 
                    className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold gap-2"
                    onClick={fetchRequests}
                >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh
                </Button>
                <Button 
                    className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus className="h-5 w-5" />
                    New Request
                </Button>
            </div>
        </div>

        {/* Requests Table */}
        <Card className="glass-panel border-none shadow-sm dark:bg-slate-900 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 mb-2">
                <div className="space-y-1.5">
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <MoreHorizontal className="h-5 w-5 text-primary rotate-90" />
                        {(isAdmin || isSteward) ? "Request Management Queue" : "Your Resource Requests"}
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                        {(isAdmin || isSteward) 
                            ? "Audit and manage Kafka resource implementations across the platform." 
                            : "Monitor the approval lifecycle of your Topic and ACL requests."}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <DataTable 
                    columns={columns} 
                    data={requests} 
                    isLoading={isLoading}
                    pagination={{ pageIndex: page - 1, pageSize: pageSize }}
                    rowCount={totalCount}
                    manualPagination
                    onPaginationChange={(updater) => {
                        const next = typeof updater === "function" ? updater({ pageIndex: page - 1, pageSize }) : updater;
                        setPage(next.pageIndex + 1);
                    }}
                />
            </CardContent>
        </Card>
      </div>

      <GovernanceRequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRequests}
      />

      <GovernanceReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        request={selectedRequest}
      />

      <Suspense fallback={null}>
          {isTopicDetailsOpen && selectedRequest && (
              <TopicDetailsModal 
                isOpen={isTopicDetailsOpen}
                onClose={() => {
                    setIsTopicDetailsOpen(false);
                    setSelectedRequest(null);
                }}
                name={selectedRequest.resource_name}
                partitions={selectedRequest.payload.partitions || selectedRequest.payload.num_partitions}
                replication={selectedRequest.payload.replication || selectedRequest.payload.replication_factor}
                cleanupPolicy={selectedRequest.payload.cleanup_policy}
                retentionMs={selectedRequest.payload.retention_ms}
                minInsyncReplicas={selectedRequest.payload.min_insync_replicas}
                config={selectedRequest.payload.extra_configs}
              />
          )}

          {isACLDetailsOpen && selectedRequest && (
              <ACLDetailsModal 
                isOpen={isACLDetailsOpen}
                onClose={() => {
                    setIsACLDetailsOpen(false);
                    setSelectedRequest(null);
                }}
                principal={selectedRequest.payload.principal}
                resourceType={selectedRequest.payload.resource_type}
                resourceName={selectedRequest.payload.resource_name}
                operation={selectedRequest.payload.operation || selectedRequest.payload.kafka_operation}
                permissionType={selectedRequest.payload.permission_type}
                patternType={selectedRequest.payload.pattern_type}
                host={selectedRequest.payload.host}
              />
          )}
      </Suspense>
    </DashboardLayout>
  );
}
