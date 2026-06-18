// TODO: Store chat history in database for cross-device sync

import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Button } from "../ui/Button";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

export interface Message {
  id: string;
  text: string;
  sender: "ai" | "user";
  suggestions?: string[];
  provider?: string;
  timestamp: number;
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatHistory({ sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession, isOpen, onClose }: ChatHistoryProps) {
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className={`${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed lg:relative z-30 lg:z-auto w-72 h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Chat History</h3>
        <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase tracking-widest gap-2"
        >
          <Plus className="w-4 h-4" /> New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 custom-scrollbar">
        {sorted.length === 0 && (
          <div className="text-center py-12 text-xs text-muted-foreground opacity-50">
            No conversations yet
          </div>
        )}
        {sorted.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
              activeSessionId === session.id
                ? "bg-primary/10 border border-primary/20 text-primary"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
            <span className="flex-1 text-xs font-semibold truncate">{session.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 rounded-lg transition-all"
              aria-label="Delete chat"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
