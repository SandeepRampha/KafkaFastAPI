import { useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DQRulesTable } from "../../components/dq/DQRulesTable";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Upload, FileText, Search, ArrowRight, ShieldCheck, Database, Zap } from "lucide-react";
import { m } from "framer-motion";

export default function DataStewardPanel() {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setFileName("kafka_retention_policy_2024.pdf");
    }, 2000);
  };

  return (
    <DashboardLayout role="data_steward">
      <div className="space-y-8 pb-12">
        {/* Header Hero */}
        <div className="relative overflow-hidden p-10 rounded-[3rem] bg-gradient-to-br from-primary to-primary/80 text-white shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 backdrop-blur-md rounded-2xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80">Autonomous Governance</span>
              </div>
              <h2 className="text-4xl font-black tracking-tighter mb-4 leading-tight">
                Data Stewardship & <br />
                <span className="text-white/70">Quality Reinforcement</span>
              </h2>
              <p className="text-white/80 font-medium text-lg leading-relaxed max-w-xl">
                Monitor and enforce data quality rules across all Kafka topics. Implement metadata policies and leverage AI to analyze governance documentation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              {[
                { icon: ShieldCheck, label: "Active Rules", val: "12" },
                { icon: Database, label: "Governed Topics", val: "481" },
              ].map((stat, i) => (
                <div key={i} className="p-6 bg-white/10 backdrop-blur-md border border-white/10 rounded-[2rem] min-w-[160px]">
                  <stat.icon className="w-5 h-5 mb-4 text-white/60" />
                  <div className="text-2xl font-black tracking-tight">{stat.val}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main DQ Rules Table */}
          <div className="lg:col-span-2">
            <DQRulesTable />
          </div>

          <div className="space-y-8">
            {/* AI Document Analysis Section */}
            <Card className="glass-card border-border/10 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-primary/5 p-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-black tracking-tighter uppercase">Governance Docs</CardTitle>
                </div>
                <CardDescription className="font-bold opacity-60 uppercase text-[10px] tracking-widest">
                  AI-Powered Ingestion & Analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {!fileName ? (
                  <div 
                    onClick={handleUpload}
                    className="group border-2 border-dashed border-border/20 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
                  >
                    <div className="mb-4 p-4 bg-secondary/50 rounded-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                      <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <p className="text-sm font-bold text-center text-muted-foreground group-hover:text-foreground transition-colors">
                      {isUploading ? "Processing..." : "Drag and drop or click to upload PDF/TXT governance docs"}
                    </p>
                    {isUploading && (
                      <div className="mt-6 w-full max-w-[120px] h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                        <m.div 
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2 }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <m.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="p-6 bg-secondary/50 rounded-3xl border border-border/5 flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-2xl">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate">{fileName}</p>
                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mt-1">Processed by AI</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Extracted Insights
                      </h4>
                      <div className="space-y-3">
                        {["Mandatory retention limit: 7 days", "PII fields require AES-256", "Null values strictly prohibited"].map((insight, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-background border border-border/10 rounded-2xl hover:border-primary/20 transition-all">
                            <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                            <span className="text-xs font-semibold">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full h-12 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border/10 text-foreground font-black text-xs uppercase tracking-widest gap-2">
                      <Search className="w-4 h-4" />
                      Ask AI about context
                    </Button>
                  </m.div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
