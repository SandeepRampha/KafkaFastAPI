import { useState, useEffect } from "react";
import { Plus, Edit2, Power, PowerOff, ShieldCheck } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { mockService } from "../../services/mock/mockService";
import type { DQRule } from "../../services/mock/mockService";
import { m, AnimatePresence } from "framer-motion";

export function DQRulesTable() {
  const [rules, setRules] = useState<DQRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    const data = await mockService.getDQRules();
    setRules(data);
    setLoading(false);
  };

  const handleToggle = async (id: string) => {
    await mockService.toggleDQRule(id);
    loadRules();
  };

  const handleAddMockRule = async () => {
    await mockService.addDQRule({
      name: "New Field Format Validation",
      type: "Format",
      status: "Active",
      topic: "transactions"
    });
    loadRules();
  };

  return (
    <Card className="glass-card border-border/10 overflow-hidden rounded-[2.5rem]">
      <CardHeader className="p-8 border-b border-border/5 bg-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black tracking-tighter uppercase">Active Governance Rules</CardTitle>
            </div>
            <CardDescription className="font-bold opacity-60 uppercase text-[10px] tracking-widest">
              Data Quality & Governance Policy Enforcement
            </CardDescription>
          </div>
          <Button 
            onClick={handleAddMockRule} 
            className="rounded-2xl h-12 px-6 gap-2 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Rule Name</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Category</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Target Topic</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5 text-sm font-medium">
              <AnimatePresence mode="popLayout">
                {rules.map((rule) => (
                  <m.tr 
                    key={rule.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-primary/[0.02] transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground/90 tracking-tight">{rule.name}</span>
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">ID: {rule.id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase tracking-widest text-[9px] px-2.5 py-1 rounded-lg">
                        {rule.type}
                      </Badge>
                    </td>
                    <td className="px-8 py-5 text-muted-foreground">
                      <span className="font-mono text-xs bg-secondary/50 px-2 py-1 rounded-md">{rule.topic}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${rule.status === "Active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${rule.status === "Active" ? "text-emerald-600" : "text-slate-500"}`}>
                          {rule.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleToggle(rule.id)}
                          className={`h-9 w-9 p-0 rounded-xl ${rule.status === "Active" ? "hover:bg-amber-100 hover:text-amber-600" : "hover:bg-emerald-100 hover:text-emerald-600"}`}
                        >
                          {rule.status === "Active" ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </m.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {loading && (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Policies...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
