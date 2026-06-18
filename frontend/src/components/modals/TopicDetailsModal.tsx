import { Info, Database, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";
import { useConfigDiff } from "../../hooks/useConfigDiff";
import { ConfigDiffHighlight } from "../requests/ConfigDiffHighlight";
import type { TopicRequestResponse as TopicRequest } from "../../services/adminService";
import { useEffect, useState } from "react";
import { Badge } from "../ui/Badge";
import { Tooltip } from "../ui/Tooltip";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

// Configuration groups for UI categorization
const CONFIG_GROUPS = [
    {
        id: "message",
        title: "Message Handling",
        keys: [
            "message.timestamp.type",
            "max.message.bytes",
            "message.timestamp.before.max.ms",
            "message.timestamp.after.max.ms",
            "message.timestamp.difference.max.ms",
            "message.downconversion.enable",
            "message.format.version"
        ]
    },
    {
        id: "compression",
        title: "Compression",
        keys: [
            "compression.type",
            "compression.gzip.level",
            "compression.lz4.level",
            "compression.zstd.level"
        ]
    },
    {
        id: "storage",
        title: "Storage Internals",
        keys: [
            "segment.bytes",
            "segment.ms",
            "segment.index.bytes",
            "segment.jitter.ms",
            "flush.messages",
            "flush.ms",
            "index.interval.bytes",
            "preallocate",
            "file.delete.delay.ms"
        ]
    },
    {
        id: "retention",
        title: "Retention",
        keys: [
            "retention.bytes",
            "delete.retention.ms",
            "local.retention.bytes",
            "local.retention.ms"
        ]
    },
    {
        id: "compaction",
        title: "Compaction",
        keys: [
            "cleanup.policy",
            "min.compaction.lag.ms",
            "max.compaction.lag.ms",
            "min.cleanable.dirty.ratio"
        ]
    }
];

interface TopicDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    request?: TopicRequest | null;
    // Optional props for direct view support
    name?: string;
    partitions?: number | string;
    replication?: number | string;
    cleanupPolicy?: string;
    retentionMs?: string;
    minInsyncReplicas?: string;
    config?: Record<string, string>;
}

export function TopicDetailsModal({
    isOpen,
    onClose,
    request,
    name,
    partitions,
    replication,
    cleanupPolicy,
    retentionMs,
    minInsyncReplicas,
    config
}: TopicDetailsModalProps) {
    // Construct a request object if one isn't provided (for standard topic view)
    const normalizedRequest = request || (name ? {
        id: -1,
        topic_name: name,
        num_partitions: partitions,
        replication_factor: replication,
        cleanup_policy: cleanupPolicy,
        retention_ms: retentionMs,
        min_insync_replicas: minInsyncReplicas,
        extra_configs: config || {},
        operation: "CREATE", // Use CREATE to avoid diff logic in useConfigDiff
        status: "APPROVED",
        username: "system"
    } as any : null);

    const [showExtraConfigs, setShowExtraConfigs] = useState(false);
    const diff = useConfigDiff(normalizedRequest);

    // Auto-expand advanced configs if there are changes
    useEffect(() => {
        if (isOpen && diff.totalExtraChanges > 0) {
            setShowExtraConfigs(true);
        } else if (isOpen) {
            setShowExtraConfigs(false);
        }
    }, [isOpen, diff.totalExtraChanges]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <span>Topic Details: {request?.topic_name}</span>
                </div>
            }
            className="max-w-3xl"
        >
            <div className="flex flex-col">
                {/* Scrollable container for details */}
                <div className="w-full space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="w-full grid grid-cols-2 gap-4 text-left">
                        <div className="w-full space-y-2 ml-1">
                            <div className="flex items-center justify-between pr-2">
                                <label className={cn(
                                    "font-semibold transition-all",
                                    diff.num_partitions.isModified 
                                        ? "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider" 
                                        : "text-sm text-slate-700 dark:text-slate-300"
                                )}>Partitions</label>
                                {diff.num_partitions.isModified && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-widest px-1.5 h-4.5 rounded">
                                        Modified
                                    </Badge>
                                )}
                            </div>
                            <ConfigDiffHighlight 
                                value={diff.num_partitions.new} 
                                oldValue={diff.num_partitions.old} 
                                isModified={diff.num_partitions.isModified} 
                            />
                        </div>
                        <div className="w-full space-y-2">
                            <div className="flex items-center justify-between pr-2">
                                <label className={cn(
                                    "font-semibold transition-all",
                                    diff.replication_factor.isModified 
                                        ? "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider" 
                                        : "text-sm text-slate-700 dark:text-slate-300"
                                )}>Replication Factor</label>
                                {diff.replication_factor.isModified && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-widest px-1.5 h-4.5 rounded">
                                        Modified
                                    </Badge>
                                )}
                            </div>
                            <ConfigDiffHighlight 
                                value={diff.replication_factor.new} 
                                oldValue={diff.replication_factor.old} 
                                isModified={diff.replication_factor.isModified} 
                            />
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-4 text-left">
                        <div className="w-full space-y-2 ml-1">
                            <div className="flex items-center justify-between pr-2">
                                <label className={cn(
                                    "font-semibold transition-all",
                                    diff.cleanup_policy.isModified 
                                        ? "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider" 
                                        : "text-sm text-slate-700 dark:text-slate-300"
                                )}>Cleanup Policy</label>
                                {diff.cleanup_policy.isModified && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-widest px-1.5 h-4.5 rounded">
                                        Modified
                                    </Badge>
                                )}
                            </div>
                            <ConfigDiffHighlight 
                                value={diff.cleanup_policy.new} 
                                oldValue={diff.cleanup_policy.old} 
                                isModified={diff.cleanup_policy.isModified} 
                            />
                        </div>
                        <div className="w-full space-y-2">
                            <div className="flex items-center justify-between pr-2">
                                <label className={cn(
                                    "font-semibold transition-all",
                                    diff.min_insync_replicas.isModified 
                                        ? "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider" 
                                        : "text-sm text-slate-700 dark:text-slate-300"
                                )}>Min In-Sync Replicas</label>
                                {diff.min_insync_replicas.isModified && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-widest px-1.5 h-4.5 rounded">
                                        Modified
                                    </Badge>
                                )}
                            </div>
                            <ConfigDiffHighlight 
                                value={diff.min_insync_replicas.new} 
                                oldValue={diff.min_insync_replicas.old} 
                                isModified={diff.min_insync_replicas.isModified} 
                            />
                        </div>
                    </div>

                    <div className="w-full space-y-2 ml-1 text-left">
                        <div className="flex items-center justify-between pr-2">
                            <label className={cn(
                                "font-semibold transition-all",
                                diff.retention_ms.isModified 
                                    ? "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider" 
                                    : "text-sm text-slate-700 dark:text-slate-300"
                            )}>Retention (ms)</label>
                            {diff.retention_ms.isModified && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black uppercase tracking-widest px-1.5 h-4.5 rounded">
                                    Modified
                                </Badge>
                            )}
                        </div>
                        <ConfigDiffHighlight 
                            value={diff.retention_ms.new} 
                            oldValue={diff.retention_ms.old} 
                            isModified={diff.retention_ms.isModified} 
                        />
                    </div>

                    {/* Extra Configs Section - Matching CreateTopicModal */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowExtraConfigs(!showExtraConfigs)}
                            className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-semibold transition-colors group"
                        >
                            <Settings className="h-4 w-4" />
                            <span>Advanced Configuration</span>
                            {diff.totalExtraChanges > 0 && (
                                <Badge className="bg-amber-500 text-white border-none ml-1 text-[10px] h-5 px-1.5 font-bold">
                                    {diff.totalExtraChanges} {diff.totalExtraChanges === 1 ? 'change' : 'changes'}
                                </Badge>
                            )}
                            {showExtraConfigs ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                        </button>
                        {showExtraConfigs && (
                            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-primary/10 rounded-md">
                                                <Settings className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Advanced configuration</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-medium">VIEW ONLY</span>
                                    </div>
                                    
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                        {CONFIG_GROUPS.map((group, groupIdx) => {
                                            const groupConfigs = Object.entries(diff.extra_configs).filter(([key]) => group.keys.includes(key));
                                            if (groupConfigs.length === 0) return null;

                                            return (
                                                <div key={group.id} className={cn(
                                                    "pb-2",
                                                    groupIdx !== 0 && "border-t border-slate-100 dark:border-slate-800/50 mt-2"
                                                )}>
                                                    <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30">
                                                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                            <div className="w-1 h-3 bg-primary/40 rounded-full" />
                                                            {group.title}
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-0.5 px-1 pt-1">
                                                        {groupConfigs.map(([key, cmp]) => (
                                                            <div
                                                                key={key}
                                                                className={cn(
                                                                    "flex items-center group/item px-3 py-1.5 gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-lg transition-colors",
                                                                    cmp.isModified && "bg-amber-500/5 dark:bg-amber-500/10"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <div className="p-1 opacity-100 transition-opacity">
                                                                        <Info className="h-3 w-3 text-slate-400" />
                                                                    </div>
                                                                    <span
                                                                        className={cn(
                                                                            "text-[11px] font-mono truncate select-none text-left flex-1",
                                                                            cmp.isModified ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-600 dark:text-slate-400"
                                                                        )}
                                                                        title={key}
                                                                    >
                                                                        {key}
                                                                    </span>
                                                                    {cmp.isModified && (
                                                                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px] font-black uppercase tracking-widest px-1 h-3.5 rounded-sm shrink-0">
                                                                            Modified
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {cmp.isModified ? (
                                                                        <Tooltip content={`Previous Value: ${cmp.old}`} side="left">
                                                                            <div className={cn(
                                                                                "w-32 text-[11px] font-mono bg-transparent border-b border-dashed text-right py-0.5 whitespace-nowrap overflow-hidden transition-colors cursor-help",
                                                                                "text-amber-700 dark:text-amber-300 border-amber-500/50 font-bold"
                                                                            )}>
                                                                                {cmp.new}
                                                                            </div>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <div className={cn(
                                                                            "w-32 text-[11px] font-mono bg-transparent border-b border-dashed text-right py-0.5",
                                                                            "text-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                                                                        )}>
                                                                            {cmp.new}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Other Configurations */}
                                        {(() => {
                                            const groupedKeys = new Set(CONFIG_GROUPS.flatMap(g => g.keys));
                                            const otherConfigs = Object.entries(diff.extra_configs).filter(([key]) => 
                                                !groupedKeys.has(key) && 
                                                key !== "retention.ms" && 
                                                key !== "cleanup.policy" && 
                                                key !== "min.insync.replicas"
                                            );
                                            
                                            if (otherConfigs.length === 0) return null;

                                            return (
                                                <div className="border-t border-slate-100 dark:border-slate-800/50 mt-2 pb-2">
                                                    <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30">
                                                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                            <div className="w-1 h-3 bg-slate-400/40 rounded-full" />
                                                            Other Configurations
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-0.5 px-1 pt-1">
                                                        {otherConfigs.map(([key, cmp]) => (
                                                            <div
                                                                key={key}
                                                                className={cn(
                                                                    "flex items-center group/item px-3 py-1.5 gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-lg transition-colors",
                                                                    cmp.isModified && "bg-amber-500/5 dark:bg-amber-500/10"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <div className="p-1 opacity-100 transition-opacity">
                                                                        <Info className="h-3 w-3 text-slate-400" />
                                                                    </div>
                                                                    <span
                                                                        className={cn(
                                                                            "text-[11px] font-mono truncate select-none text-left flex-1",
                                                                            cmp.isModified ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-600 dark:text-slate-400"
                                                                        )}
                                                                        title={key}
                                                                    >
                                                                        {key}
                                                                    </span>
                                                                    {cmp.isModified && (
                                                                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px] font-black uppercase tracking-widest px-1 h-3.5 rounded-sm shrink-0">
                                                                            Modified
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {cmp.isModified ? (
                                                                        <Tooltip content={`Previous Value: ${cmp.old}`} side="left">
                                                                            <div className={cn(
                                                                                "w-32 text-[11px] font-mono bg-transparent border-b border-dashed text-right py-0.5 whitespace-nowrap overflow-hidden transition-colors cursor-help",
                                                                                "text-amber-700 dark:text-amber-300 border-amber-500/50 font-bold"
                                                                            )}>
                                                                                {cmp.new}
                                                                            </div>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <div className={cn(
                                                                            "w-32 text-[11px] font-mono bg-transparent border-b border-dashed text-right py-0.5",
                                                                            "text-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                                                                        )}>
                                                                            {cmp.new}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-3 px-2 py-2 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <div className="p-1 bg-primary/10 rounded-md">
                                        <Info className="h-3 w-3 text-primary" />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                                        These are advanced Kafka topic properties. They are read-only in this view.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        onClick={onClose}
                        className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-semibold shadow-sm transition-all active:scale-95"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

