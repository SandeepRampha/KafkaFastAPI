import { useMemo } from "react";
import type { TopicRequestResponse as TopicRequest } from "../services/adminService";

export interface ConfigDiff {
    num_partitions: { old: number | string; new: number | string; isModified: boolean };
    replication_factor: { old: number | string; new: number | string; isModified: boolean };
    retention_ms: { old: string; new: string; isModified: boolean };
    cleanup_policy: { old: string; new: string; isModified: boolean };
    min_insync_replicas: { old: string; new: string; isModified: boolean };
    extra_configs: Record<string, { old: string; new: string; isModified: boolean }>;
    hasChanges: boolean;
    totalExtraChanges: number;
}

export function useConfigDiff(request: TopicRequest | null): ConfigDiff {
    return useMemo(() => {
        const defaultDiff: ConfigDiff = {
            num_partitions: { old: "-", new: "-", isModified: false },
            replication_factor: { old: "-", new: "-", isModified: false },
            retention_ms: { old: "-", new: "-", isModified: false },
            cleanup_policy: { old: "-", new: "-", isModified: false },
            min_insync_replicas: { old: "-", new: "-", isModified: false },
            extra_configs: {},
            hasChanges: false,
            totalExtraChanges: 0,
        };

        if (!request || request.operation !== "ALTER" || !request.existing_config) {
            if (request) {
                return {
                    ...defaultDiff,
                    num_partitions: { old: "-", new: request.num_partitions ?? "-", isModified: false },
                    replication_factor: { old: "-", new: request.replication_factor ?? "-", isModified: false },
                    retention_ms: { old: "-", new: request.retention_ms?.toString() || request.config?.["retention.ms"]?.toString() || "-", isModified: false },
                    cleanup_policy: { old: "-", new: request.cleanup_policy || request.config?.["cleanup.policy"] || "-", isModified: false },
                    min_insync_replicas: { old: "-", new: request.min_insync_replicas?.toString() || request.config?.["min.insync.replicas"]?.toString() || "-", isModified: false },
                    extra_configs: Object.entries(request.extra_configs || request.config || {}).reduce((acc, [k, v]) => {
                        acc[k] = { old: "-", new: v?.toString() || "-", isModified: false };
                        return acc;
                    }, {} as Record<string, any>),
                };
            }
            return defaultDiff;
        }

        const existing = request.existing_config;
        const proposed = request;

        const compare = (oldVal: any, newVal: any) => {
            const oldS = oldVal?.toString();
            const newS = newVal?.toString();
            return {
                old: oldS ?? "-",
                new: newS ?? "-",
                isModified: (oldS !== newS) && (oldS !== undefined || newS !== undefined)
            };
        };

        const diff: ConfigDiff = {
            num_partitions: compare(existing.num_partitions, proposed.num_partitions),
            replication_factor: compare(existing.replication_factor, proposed.replication_factor),
            retention_ms: compare(
                existing.retention_ms || existing.config?.["retention.ms"],
                proposed.retention_ms || proposed.config?.["retention.ms"]
            ),
            cleanup_policy: compare(
                existing.cleanup_policy || existing.config?.["cleanup.policy"],
                proposed.cleanup_policy || proposed.config?.["cleanup.policy"]
            ),
            min_insync_replicas: compare(
                existing.min_insync_replicas || existing.config?.["min.insync.replicas"],
                proposed.min_insync_replicas || proposed.config?.["min.insync.replicas"]
            ),
            extra_configs: {},
            hasChanges: false,
            totalExtraChanges: 0,
        };

        // Handle extra configs
        const allKeys = new Set([
            ...Object.keys(existing.extra_configs || existing.config || {}),
            ...Object.keys(proposed.extra_configs || proposed.config || {}),
        ]);

        const ignoredKeys = ["retention.ms", "cleanup.policy", "min.insync.replicas"];

        allKeys.forEach((key) => {
            if (ignoredKeys.includes(key)) return;
            
            const oldVal = (existing.extra_configs || existing.config)?.[key];
            const newVal = (proposed.extra_configs || proposed.config)?.[key];
            
            if (newVal !== undefined) {
                const cmp = compare(oldVal, newVal);
                diff.extra_configs[key] = cmp;
                if (cmp.isModified) {
                    diff.totalExtraChanges++;
                }
            }
        });

        diff.hasChanges = 
            diff.num_partitions.isModified ||
            diff.replication_factor.isModified ||
            diff.retention_ms.isModified ||
            diff.cleanup_policy.isModified ||
            diff.min_insync_replicas.isModified ||
            diff.totalExtraChanges > 0;

        return diff;
    }, [request]);
}
