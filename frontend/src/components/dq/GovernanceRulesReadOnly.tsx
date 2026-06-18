import { useState, useEffect } from "react";
import { ShieldCheck, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { mockService } from "../../services/mock/mockService";
import type { DQRule } from "../../services/mock/mockService";

export function GovernanceRulesReadOnly() {
  const [rules, setRules] = useState<DQRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await mockService.getDQRules();
      setRules(data);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="glass-card border-border/10 overflow-hidden rounded-[2.5rem]">
      <CardHeader className="p-8 border-b border-border/5 bg-emerald-500/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <CardTitle className="text-xl font-black tracking-tighter uppercase">Governance Rules</CardTitle>
            </div>
            <CardDescription className="font-bold opacity-60 uppercase text-[10px] tracking-widest">
              Active policies that apply to your topics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Read Only</span>
          </div>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5 text-sm font-medium">
              {rules.filter(r => r.status === "Active").map((rule) => (
                <tr key={rule.id} className="hover:bg-emerald-500/[0.02] transition-colors">
                  <td className="px-8 py-5">
                    <span className="font-bold text-foreground/90 tracking-tight">{rule.name}</span>
                  </td>
                  <td className="px-8 py-5">
                    <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 font-black uppercase tracking-widest text-[9px] px-2.5 py-1 rounded-lg">
                      {rule.type}
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-muted-foreground">
                    <span className="font-mono text-xs bg-secondary/50 px-2 py-1 rounded-md">{rule.topic}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Active</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Loading Policies...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
