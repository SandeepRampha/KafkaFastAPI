// TODO: Integrate Cloudera CAI instead of direct APIs
// TODO: Add RAG for document intelligence

import { useRef, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import Bot from "lucide-react/dist/esm/icons/bot";
import User from "lucide-react/dist/esm/icons/user";
import Send from "lucide-react/dist/esm/icons/send";
import type { Message } from "./ChatHistory";

interface ChatWindowProps {
  messages: Message[];
  input: string;
  isTyping: boolean;
  provider: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
}

export function ChatWindow({ messages, input, isTyping, provider, onInputChange, onSend }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight uppercase">Kafka AI Workspace</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Deep Analysis & Insights</p>
          </div>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest">
          {provider}
        </Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-40">
            <Bot className="w-12 h-12 text-primary mb-4" />
            <p className="text-sm font-bold text-muted-foreground">Start a conversation</p>
            <p className="text-xs text-muted-foreground mt-1">Ask about topics, ACLs, or cluster health</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg) => (
            <m.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.sender === "user"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    : "bg-primary text-white"
                }`}>
                  {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="space-y-2">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-slate-100 dark:bg-slate-800 rounded-tr-sm text-slate-700 dark:text-slate-200"
                      : "bg-primary/5 border border-primary/10 rounded-tl-sm text-slate-800 dark:text-slate-100"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  {msg.provider && msg.sender === "ai" && (
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 px-1">via {msg.provider}</span>
                  )}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => onSend(s)}
                          className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary border border-slate-200 dark:border-slate-700 text-muted-foreground transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          ))}
          {isTyping && (
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex gap-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <m.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                <m.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                <m.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <form onSubmit={(e) => { e.preventDefault(); onSend(input); }} className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask anything about the Kafka cluster..."
            className="flex-1 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="h-12 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white gap-2"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
