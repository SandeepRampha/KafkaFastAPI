// TODO: Move AI logic to backend service layer
// TODO: Secure API keys via AWS IAM / Secrets Manager
// TODO: Store chat history in database

import { useState, useCallback, useEffect } from "react";
import { ChatHistory, type ChatSession, type Message } from "./ChatHistory";
import { ChatWindow } from "./ChatWindow";
import { ContextPanel } from "./ContextPanel";
import { askAI, getActiveProvider, type AIContext } from "../../services/ai/aiServiceProvider";
import { useAuth } from "../../contexts/AuthContext";
import { Menu } from "lucide-react";

const STORAGE_KEY = "ai_workspace_sessions";

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function AIWorkspace() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => loadSessions()[0]?.id || null
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const context: AIContext = {
    role: user?.role,
    page: "ai-workspace",
  };

  // Save sessions to localStorage when changed
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const handleNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: "New Chat",
      createdAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveSessionId((current) => current === id ? null : current);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    // Auto-create session if none active
    let targetId = activeSessionId;
    if (!targetId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: text.slice(0, 40),
        createdAt: Date.now(),
        messages: [],
      };
      setSessions((prev) => [newSession, ...prev]);
      targetId = newSession.id;
      setActiveSessionId(targetId);
    }

    const userMsg: Message = {
      id: generateId(),
      text,
      sender: "user",
      timestamp: Date.now(),
    };

    // Update title if it's the first message in the session
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== targetId) return s;
        const isFirstMsg = s.messages.length === 0;
        return {
          ...s,
          title: isFirstMsg ? text.slice(0, 40) : s.title,
          messages: [...s.messages, userMsg],
        };
      })
    );
    setInput("");
    setIsTyping(true);

    try {
      const response = await askAI(text, context);
      const aiMsg: Message = {
        id: generateId(),
        text: response.answer,
        sender: "ai",
        suggestions: response.suggestions,
        provider: response.provider,
        timestamp: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetId ? { ...s, messages: [...s.messages, aiMsg] } : s
        )
      );
    } catch {
      const errMsg: Message = {
        id: generateId(),
        text: "Sorry, something went wrong. Please try again.",
        sender: "ai",
        timestamp: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetId ? { ...s, messages: [...s.messages, errMsg] } : s
        )
      );
    } finally {
      setIsTyping(false);
    }
  }, [activeSessionId, isTyping, context]);

  return (
    <div className="flex h-[calc(99vh-60px)] -mx-4 -my-4 lg:-mx-6 lg:-my-6 bg-transparent border-t border-slate-200 dark:border-slate-800">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-28 left-20 z-40 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left: Chat History */}
      <ChatHistory
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => { setActiveSessionId(id); setSidebarOpen(false); }}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Center: Chat Window */}
      <ChatWindow
        messages={activeSession?.messages || []}
        input={input}
        isTyping={isTyping}
        provider={getActiveProvider()}
        onInputChange={setInput}
        onSend={handleSend}
      />

      {/* Right: Context Panel */}
      <ContextPanel
        context={context}
        onAction={handleSend}
      />
    </div>
  );
}
