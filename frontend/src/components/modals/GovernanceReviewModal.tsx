import { Modal } from "../ui/Modal";
import type { GovernanceRequest } from "../../services/governanceService";
import { GovernanceOperation, GovernanceResourceType } from "../../services/governanceService";
import { FileText, Shield, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

interface GovernanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: GovernanceRequest | null;
}

export function GovernanceReviewModal({ isOpen, onClose, request }: GovernanceReviewModalProps) {
  if (!request) return null;

  const isAlter = request.operation === GovernanceOperation.ALTER;
  const isTopic = request.resource_type === GovernanceResourceType.TOPIC;

  const renderDiffItem = (label: string, oldVal: any, newVal: any) => {
    const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);
    
    return (
      <div className={cn(
        "flex flex-col gap-1 p-3 rounded-xl border transition-all",
        hasChanged ? "bg-amber-500/[0.03] border-amber-200 dark:border-amber-900/50" : "bg-slate-50 dark:bg-slate-900/50 border-transparent"
      )}>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className="flex items-center gap-3">
          {isAlter && (
            <>
              <span className="text-sm font-mono text-slate-500 line-through opacity-70">
                {String(oldVal ?? "N/A")}
              </span>
              <ArrowRight className="h-3 w-3 text-slate-300" />
            </>
          )}
          <span className={cn(
            "text-sm font-mono font-bold",
            hasChanged ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-200"
          )}>
            {String(newVal ?? "N/A")}
          </span>
        </div>
      </div>
    );
  };

  const renderConfigDiff = (oldConfigs: any = {}, newConfigs: any = {}) => {
      const allKeys = Array.from(new Set([...Object.keys(oldConfigs), ...Object.keys(newConfigs)]));
      
      return (
          <div className="space-y-2 mt-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Configuration Changes</h4>
              <div className="grid grid-cols-1 gap-1.5">
                  {allKeys.map(key => {
                      const oldVal = oldConfigs[key];
                      const newVal = newConfigs[key];
                      const hasChanged = oldVal !== newVal;
                      
                      if (!hasChanged && !isAlter) return null; // Show all for create, only changes for Alter (unless we want full view)
                      
                      return (
                          <div key={key} className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono border transition-all",
                              hasChanged ? "bg-amber-500/5 border-amber-200/50 text-amber-900 dark:text-amber-100" : "bg-slate-50 dark:bg-slate-900/30 border-transparent text-slate-500"
                          )}>
                              <span className="truncate mr-4">{key}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                  {isAlter && hasChanged && (
                                      <>
                                          <span className="opacity-50 line-through">{String(oldVal ?? "")}</span>
                                          <ArrowRight className="h-3 w-3 opacity-30" />
                                      </>
                                  )}
                                  <span className={cn(hasChanged && "font-bold")}>{String(newVal ?? "")}</span>
                              </div>
                          </div>
                      );
                  })}
                  {allKeys.length === 0 && <p className="text-xs italic text-slate-400 p-2">No extra configurations provided.</p>}
              </div>
          </div>
      )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isTopic ? <FileText className="h-5 w-5 text-blue-500" /> : <Shield className="h-5 w-5 text-violet-500" />}
          <span>{request.operation} Request: {request.resource_name}</span>
        </div>
      }
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Request Header Info */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted By</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{request.created_by}</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested On</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString()}
                </p>
            </div>
        </div>

        {/* Diff Section */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Technical Specification</h3>
            </div>

            {isTopic ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {renderDiffItem("Partitions", request.old_payload?.partitions, request.payload.partitions ?? request.payload.num_partitions)}
                        {renderDiffItem("Replication", request.old_payload?.replication, request.payload.replication ?? request.payload.replication_factor)}
                        {renderDiffItem("Cleanup Policy", request.old_payload?.cleanup_policy, request.payload.cleanup_policy)}
                        {renderDiffItem("Min. ISR", request.old_payload?.min_insync_replicas, request.payload.min_insync_replicas)}
                    </div>
                    {renderConfigDiff(request.old_payload?.extra_configs, request.payload.extra_configs)}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {renderDiffItem("Principal", request.old_payload?.principal, request.payload.principal)}
                        {renderDiffItem("Permission", request.old_payload?.permission_type, request.payload.permission_type)}
                        {renderDiffItem("Action", request.old_payload?.operation, request.payload.operation)}
                        {renderDiffItem("Host", request.old_payload?.host, request.payload.host)}
                    </div>
                </div>
            )}
        </div>

        {/* Warning for Deletions */}
        {request.operation === GovernanceOperation.DELETE && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">Destructive Operation</p>
                    <p className="text-xs text-red-500 opacity-90">This request will PERMANENTLY delete the resource. Ensure all dependent applications are notified.</p>
                </div>
            </div>
        )}

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <button 
                onClick={onClose}
                className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all"
            >
                Close Review
            </button>
        </div>
      </div>
    </Modal>
  );
}
