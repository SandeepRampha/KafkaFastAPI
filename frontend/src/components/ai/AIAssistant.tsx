import { useState, useRef, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, Sparkles } from "lucide-react";
import { Input } from "../ui/Input";
import { askAI } from "../../services/ai/aiServiceProvider";

interface Message {
  id: string;
  text: string;
  sender: "ai" | "user";
  suggestions?: string[];
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your Kafka AI Assistant. How can I help you manage your cluster today?",
      sender: "ai",
      suggestions: ["Tell me about lag", "Explain ACLs", "What is retention?"]
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await askAI(text, { role: "admin", page: "floating-widget" });
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        sender: "ai",
        suggestions: response.suggestions
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: "Sorry, something went wrong. Please try again.", sender: "ai" }]);
    } finally {
      setIsTyping(false);
    }
  };


  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-[400px] h-[550px] bg-background border border-border/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col glass-card"
          >
            {/* Header */}
            <div className="p-6 bg-primary/10 border-b border-border/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest text-primary">Kafka AI</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Cloudera CAI Powered</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
            >
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.sender === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                      {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className="space-y-3">
                      <div className={`p-4 rounded-[1.5rem] text-sm leading-relaxed ${msg.sender === "user" ? "bg-secondary/50 rounded-tr-none text-foreground" : "bg-primary/10 rounded-tl-none text-foreground"}`}>
                        {msg.text}
                      </div>
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(s)}
                              className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-secondary/30 hover:bg-secondary/50 border border-border/5 text-muted-foreground transition-all"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex gap-1">
                      <m.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <m.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <m.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-border/10 bg-background/50 backdrop-blur-sm">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="flex gap-3"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about Kafka..."
                  className="flex-1 h-12 bg-secondary/30 border-none rounded-2xl text-sm font-medium focus:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-12 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <m.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-xl transition-all duration-300 ${isOpen ? "bg-destructive text-white" : "bg-primary text-white"}`}
        aria-label={isOpen ? "Close Assistant" : "Open Assistant"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </m.button>
    </div>
  );
}
