// TODO: Add RAG for document intelligence
// TODO: Connect to real topic/ACL metadata APIs

import { Badge } from "../ui/Badge";
import { useAuth } from "../../contexts/AuthContext";
import { getActiveProvider } from "../../services/ai/aiServiceProvider";
import Shield from "lucide-react/dist/esm/icons/shield";
import Database from "lucide-react/dist/esm/icons/database";
import Activity from "lucide-react/dist/esm/icons/activity";
import Zap from "lucide-react/dist/esm/icons/zap";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Upload from "lucide-react/dist/esm/icons/upload";
import Settings from "lucide-react/dist/esm/icons/settings";
import type { AIContext } from "../../services/ai/aiServiceProvider";

interface ContextPanelProps {
  context: AIContext;
  onAction: (prompt: string) => void;
}

const ACTIONS = [
  { label: "Optimize Topics", prompt: "Analyze my top 5 topics and suggest partition count and retention optimizations for better throughput.", icon: Zap, color: "text-amber-500" },
  { label: "Analyze ACLs", prompt: "Review my ACL configurations and identify any overly-permissive or redundant permissions that could be a security risk.", icon: Shield, color: "text-purple-500" },
  { label: "Check DQ Rules", prompt: "List all active Data Quality rules and highlight any topics that are violating governance policies.", icon: Activity, color: "text-emerald-500" },
  { label: "Cluster Health", prompt: "Give me a health summary of the Kafka cluster including broker status, under-replicated partitions, and disk usage.", icon: Settings, color: "text-blue-500" },
];

const QUICK_COMMANDS = [
  "List all active topics",
  "Explain consumer lag",
  "Summarize best practices for production Kafka",
  "What is topic compaction?",
];

export function ContextPanel({ context, onAction }: ContextPanelProps) {
  const { user } = useAuth();
  const provider = getActiveProvider();

  return (
    <div className="w-72 h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col overflow-y-auto custom-scrollbar hidden xl:flex">
      {/* Context Info */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Active Context</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role</span>
            <Badge className="bg-primary/10 text-primary border-primary/20 rounded-md text-[9px] font-black uppercase px-2 py-0.5">
              {user?.role || context.role || "user"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Page</span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{context.page || "workspace"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Provider</span>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rounded-md text-[9px] font-black uppercase px-2 py-0.5">
              {provider}
            </Badge>
          </div>
          {context.topic && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Topic</span>
              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">{context.topic}</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Actions */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">AI Actions</h4>
        <div className="space-y-2">
          {ACTIONS.map((action, i) => (
            <button
              key={i}
              onClick={() => onAction(action.prompt)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
            >
              <action.icon className={`w-4 h-4 ${action.color} shrink-0`} />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-primary tracking-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Commands */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Quick Commands</h4>
        <div className="space-y-1.5">
          {QUICK_COMMANDS.map((cmd, i) => (
            <button
              key={i}
              onClick={() => onAction(cmd)}
              className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-primary hover:bg-primary/5 transition-all truncate"
            >
              → {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Document Intelligence (Mock) */}
      <div className="p-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Documents</h4>
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all group"
             onClick={() => onAction("Analyze the uploaded governance document and extract key retention policies and compliance requirements.")}
        >
          <Upload className="w-6 h-6 text-slate-300 group-hover:text-primary mb-2" />
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary">Upload & Analyze</span>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[10px] font-semibold text-slate-500 truncate">kafka_retention_policy.pdf</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Database className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[10px] font-semibold text-slate-500 truncate">cluster_audit_log.csv</span>
          </div>
        </div>
      </div>
    </div>
  );
}
