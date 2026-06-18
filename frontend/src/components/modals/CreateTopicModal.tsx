import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../../contexts/NotificationContext";
import Plus from "lucide-react/dist/esm/icons/plus";
import Settings from "lucide-react/dist/esm/icons/settings";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import Info from "lucide-react/dist/esm/icons/info";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import { createTopic } from "../../services/adminService";
import { cn } from "../../lib/utils";
import { KAFKA_EXTRA_CONFIG_DEFAULTS } from "../../constants/kafkaConfigs";
import governanceService, { GovernanceResourceType, GovernanceOperation } from "../../services/governanceService";

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

interface CreateTopicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    isRequest?: boolean; // New prop to distinguish between direct creation and request
}

import { useHealth } from "../../hooks/queries/useHealth";

export function CreateTopicModal({ isOpen, onClose, onSuccess, isRequest = true }: CreateTopicModalProps) {
    const toast = useToast();
    const { data: healthData } = useHealth();
    const onlineBrokers = healthData?.broker_status?.online_brokers || 0;
    const recommendedMinIsr = onlineBrokers > 0 ? Math.floor(onlineBrokers / 2) + 1 : 1;

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        topicName: "",
        partitions: "1",
        replication: "3",
        retentionMs: "604800000",
        cleanupPolicy: "delete",
        minInsyncReplicas: "1",
    });

    const [showExtraConfigs, setShowExtraConfigs] = useState(false);
    const [extraConfigs, setExtraConfigs] = useState<Record<string, string>>({ ...KAFKA_EXTRA_CONFIG_DEFAULTS });
    const [selectedRetention, setSelectedRetention] = useState<string | null>(null);

    const retentionToMs: Record<string, number> = {
        "12h": 12 * 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
        "2d": 2 * 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "4w": 4 * 7 * 24 * 60 * 60 * 1000
    };

    const errors = {
        topicName: !formData.topicName.trim() ? "Topic Name is required" : "",
        partitions: !formData.partitions.toString().trim() ? "Partitions is required" : 
                   parseInt(formData.partitions) > 50 ? "Maximum allowed partitions is 50" : 
                   parseInt(formData.partitions) < 1 ? "Partitions must be at least 1" : "",
        replication: !formData.replication.toString().trim() ? "Replication Factor is required" :
                    (onlineBrokers > 0 && parseInt(formData.replication) > onlineBrokers) ? `Replication factor cannot exceed available brokers (max: ${onlineBrokers})` :
                    parseInt(formData.replication) < 1 ? "Replication factor must be at least 1" : "",
        minInsyncReplicas: !formData.minInsyncReplicas.toString().trim() ? "Please enter a valid min in-sync replicas value" :
                          parseInt(formData.minInsyncReplicas) > parseInt(formData.replication) ? `Min in-sync replicas cannot exceed replication factor (max: ${formData.replication})` :
                          parseInt(formData.minInsyncReplicas) < 1 ? "Min In-Sync Replicas must be at least 1" : "",
        retentionMs: !formData.retentionMs.toString().trim() ? "Retention is required" : "",
    };

    const warnings = {
        minInsyncReplicas: (parseInt(formData.minInsyncReplicas) < recommendedMinIsr && !errors.minInsyncReplicas) 
            ? `Recommended min in-sync replicas is ${recommendedMinIsr} for better fault tolerance` 
            : "",
    };

    const isFormValid = Object.values(errors).every(err => err === "");

    const hasError = (field: keyof typeof errors) => {
        return !!errors[field] && (touched[field] || submitAttempted);
    };

    const hasWarning = (field: keyof typeof warnings) => {
        return !!warnings[field] && (touched[field] || submitAttempted);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "retentionMs") {
            setSelectedRetention(null);
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRetentionSelect = (option: string) => {
        const ms = retentionToMs[option];
        setFormData(prev => ({ ...prev, retentionMs: ms.toString() }));
        setSelectedRetention(option);
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const { mutate: submitTopic, isPending: isSubmitting } = useMutation({
        mutationFn: (topicData: any) => {
            if (isRequest) {
                return governanceService.createRequest({
                    resource_type: GovernanceResourceType.TOPIC,
                    resource_name: topicData.name,
                    operation: GovernanceOperation.CREATE,
                    payload: topicData,
                    cluster_id: "default"
                });
            }
            return createTopic(topicData);
        },
        onSuccess: () => {
            const message = isRequest 
                ? "Topic creation request submitted successfully!" 
                : "Topic created successfully!";
            toast.success(message);
            if (onSuccess) onSuccess();
            onClose();
        },
        onError: (error: any) => {
            const detail = error.response?.data?.detail;
            if (detail) {
                setSubmitError(detail);
            } else {
                toast.error(isRequest ? "Failed to submit topic request" : "Failed to create topic");
            }
        }
    });

    const handleSubmit = () => {
        setSubmitAttempted(true);
        setSubmitError(null);
        if (!isFormValid) {
            return;
        }

        let parsedExtraConfigs: Record<string, any> | undefined = undefined;
        if (showExtraConfigs) {
            const emptyKeys = Object.entries(extraConfigs)
                .filter(([, v]) => v.trim() === "")
                .map(([k]) => k);
            const allowedEmpty = new Set(["confluent.context.name", "confluent.placement.constraints", "follower.replication.throttled.replicas", "leader.replication.throttled.replicas"]);
            const invalidEmpty = emptyKeys.filter(k => !allowedEmpty.has(k));
            if (invalidEmpty.length > 0) {
                const shown = invalidEmpty.slice(0, 2).join(", ");
                const more = invalidEmpty.length > 2 ? ` and ${invalidEmpty.length - 2} more` : "";
                setSubmitError(`Config values cannot be empty: ${shown}${more}`);
                return;
            }
            
            const filtered: Record<string, string> = {};
            Object.entries(extraConfigs).forEach(([k, v]) => {
                const trimmedValue = v.trim();
                if (trimmedValue !== "") {
                    filtered[k] = trimmedValue;
                }
            });

            delete filtered["retention.ms"];
            delete filtered["cleanup.policy"];
            delete filtered["min.insync.replicas"];
            parsedExtraConfigs = filtered;
        }

        submitTopic({
            name: formData.topicName,
            num_partitions: parseInt(formData.partitions),
            replication_factor: parseInt(formData.replication),
            retention_ms: parseInt(formData.retentionMs),
            cleanup_policy: formData.cleanupPolicy,
            min_insync_replicas: parseInt(formData.minInsyncReplicas),
            extra_configs: showExtraConfigs ? parsedExtraConfigs : undefined,
        });
    };

    const resetForm = () => {
        setFormData({
            topicName: "",
            partitions: "1",
            replication: "3",
            retentionMs: "604800000",
            cleanupPolicy: "delete",
            minInsyncReplicas: "1",
        });
        setTouched({});
        setSubmitAttempted(false);
        setShowExtraConfigs(false);
        setExtraConfigs({ ...KAFKA_EXTRA_CONFIG_DEFAULTS });
        setSelectedRetention(null);
        setSubmitError(null);
    };

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            isSubmitting={isSubmitting}
            title={
                <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    <span>{isRequest ? "Create New Topic Request" : "Create New Topic"}</span>
                </div>
            }
            className="max-w-2xl"
        >
            <div className="flex flex-col">
                {/* Scrollable container for form fields */}
                <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Topic Name */}
                    <div className="space-y-2 ml-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Topic Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            name="topicName"
                            value={formData.topicName}
                            onChange={handleInputChange}
                            onBlur={() => handleBlur("topicName")}
                            placeholder="e.g. user-logs-v1"
                            className={cn(
                                "h-11 bg-slate-50 dark:bg-slate-900",
                                hasError("topicName") ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                            )}
                        />
                        {hasError("topicName") && <p className="text-sm text-red-500">{errors.topicName}</p>}
                    </div>

                    {/* Partitions & Replication */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 ml-1">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Partitions <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                name="partitions"
                                value={formData.partitions}
                                onChange={handleInputChange}
                                onBlur={() => handleBlur("partitions")}
                                placeholder="1"
                                className={cn(
                                    "h-11 bg-slate-50 dark:bg-slate-900",
                                    hasError("partitions") ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                                )}
                            />
                            {hasError("partitions") && <p className="text-sm text-red-500">{errors.partitions}</p>}
                        </div>

                        <div className="space-y-2 ">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Replication Factor <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                name="replication"
                                value={formData.replication}
                                onChange={handleInputChange}
                                onBlur={() => handleBlur("replication")}
                                placeholder="3"
                                className={cn(
                                    "h-11 bg-slate-50 dark:bg-slate-900",
                                    hasError("replication") ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                                )}
                            />
                            {hasError("replication") && <p className="text-sm text-red-500">{errors.replication}</p>}
                        </div>
                    </div>

                    {/* Cleanup Policy & Min In-Sync Replicas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 ml-1">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Cleanup Policy <span className="text-red-500">*</span>
                            </label>
                            <Select
                                value={formData.cleanupPolicy}
                                onChange={(val) => {
                                    handleSelectChange("cleanupPolicy", val);
                                    handleBlur("cleanupPolicy");
                                }}
                                options={[
                                    { label: "Delete", value: "delete" },
                                    { label: "Compact", value: "compact" }
                                ]}
                                className={cn(
                                    "bg-slate-50 dark:bg-slate-900",
                                    hasError("replication") ? "border-slate-200 dark:border-slate-800" : "border-slate-200 dark:border-slate-800"
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Min In-Sync Replicas <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                name="minInsyncReplicas"
                                value={formData.minInsyncReplicas}
                                onChange={handleInputChange}
                                onBlur={() => handleBlur("minInsyncReplicas")}
                                placeholder="1"
                                className={cn(
                                    "h-11 bg-slate-50 dark:bg-slate-900",
                                    hasError("minInsyncReplicas") ? "border-red-500 ring-1 ring-red-500" : 
                                    hasWarning("minInsyncReplicas") ? "border-amber-500 ring-1 ring-amber-500" :
                                    "border-slate-200 dark:border-slate-800"
                                )}
                            />
                            {hasError("minInsyncReplicas") && <p className="text-sm text-red-500">{errors.minInsyncReplicas}</p>}
                            {hasWarning("minInsyncReplicas") && !hasError("minInsyncReplicas") && (
                                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                                    <Info className="h-3 w-3" />
                                    {warnings.minInsyncReplicas}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Retention (ms) with Quick Select */}
                    <div className="space-y-3 ml-1">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Retention (ms) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                {Object.keys(retentionToMs).map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => handleRetentionSelect(option)}
                                        className={cn(
                                            "px-2 py-1 text-[10px] font-bold rounded-md transition-all border",
                                            selectedRetention === option 
                                                ? "bg-primary text-white border-primary shadow-sm" 
                                                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-primary/50"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Input
                            type="number"
                            name="retentionMs"
                            value={formData.retentionMs}
                            onChange={handleInputChange}
                            onBlur={() => handleBlur("retentionMs")}
                            placeholder="604800000"
                            className={cn(
                                "h-11 bg-slate-50 dark:bg-slate-900",
                                hasError("retentionMs") ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-800"
                            )}
                        />
                        {hasError("retentionMs") && <p className="text-sm text-red-500">{errors.retentionMs}</p>}
                    </div>

                    {/* Extra Configs Toggle */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowExtraConfigs(!showExtraConfigs)}
                            className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-semibold transition-colors group"
                        >
                            <Settings className="h-4 w-4" />
                            <span>Advanced Configuration</span>
                            {showExtraConfigs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                                        <span className="text-[10px] text-slate-500 font-medium">KEY — VALUE EDITOR</span>
                                    </div>
                                    
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                        {CONFIG_GROUPS.map((group, groupIdx) => {
                                            const groupConfigs = Object.entries(extraConfigs).filter(([key]) => group.keys.includes(key));
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
                                                        {groupConfigs.map(([key, value]) => (
                                                            <div
                                                                key={key}
                                                                className="flex items-center group/item px-3 py-1.5 gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-lg transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <div className="p-1 opacity-0 group-hover/item:opacity-40 transition-opacity">
                                                                        <Info className="h-3 w-3 text-slate-400" />
                                                                    </div>
                                                                    <span
                                                                        className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate select-none"
                                                                        title={key}
                                                                    >
                                                                        {key}
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <input
                                                                        value={value}
                                                                        onChange={(e) => setExtraConfigs(prev => ({ ...prev, [key]: e.target.value }))}
                                                                        className="w-32 text-[11px] font-mono text-slate-900 dark:text-slate-200 bg-transparent focus:outline-none border-b border-dashed border-slate-200 dark:border-slate-700 focus:border-primary dark:focus:border-primary transition-colors text-right py-0.5"
                                                                    />
                                                                    <Pencil className="h-3 w-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Other Configurations that don't fit in predefined groups */}
                                        {(() => {
                                            const groupedKeys = new Set(CONFIG_GROUPS.flatMap(g => g.keys));
                                            const otherConfigs = Object.entries(extraConfigs).filter(([key]) => !groupedKeys.has(key));
                                            
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
                                                        {otherConfigs.map(([key, value]) => (
                                                            <div
                                                                key={key}
                                                                className="flex items-center group/item px-3 py-1.5 gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-lg transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <div className="p-1 opacity-0 group-hover/item:opacity-40 transition-opacity">
                                                                        <Info className="h-3 w-3 text-slate-400" />
                                                                    </div>
                                                                    <span
                                                                        className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate select-none"
                                                                        title={key}
                                                                    >
                                                                        {key}
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <input
                                                                        value={value}
                                                                        onChange={(e) => setExtraConfigs(prev => ({ ...prev, [key]: e.target.value }))}
                                                                        className="w-32 text-[11px] font-mono text-slate-900 dark:text-slate-200 bg-transparent focus:outline-none border-b border-dashed border-slate-200 dark:border-slate-700 focus:border-primary dark:focus:border-primary transition-colors text-right py-0.5"
                                                                    />
                                                                    <Pencil className="h-3 w-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium px-1 flex items-center gap-1.5">
                                    <Info className="h-3 w-3" />
                                    <span>Config keys are fixed. Edit only the values on the right.</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Backend submit error banner */}
                {submitError && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Configuration Error</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 break-words">{submitError}</p>
                        </div>
                    </div>
                )}

                {/* Buttons - Fixed outside scrollable area */}
                <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        variant="cancel"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 h-12 rounded-xl transition-all font-semibold"
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={isSubmitting || !isFormValid}
                        className={cn(
                            "flex-1 h-12 rounded-xl font-semibold shadow-sm transition-all",
                            (!isFormValid || isSubmitting)
                                ? "bg-primary/50 text-white/70 cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-white"
                        )}
                    >
                        {isSubmitting ? "Submitting..." : (isRequest ? "Submit Request" : "Create Topic")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
