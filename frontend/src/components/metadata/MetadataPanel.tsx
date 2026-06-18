import { useState, useEffect } from "react";
import { Tag, Save, User, Globe, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/Card";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { mockService } from "../../services/mock/mockService";
import type { TopicMetadata } from "../../services/mock/mockService";
import { m, AnimatePresence } from "framer-motion";

interface MetadataPanelProps {
  topicName: string;
}

export function MetadataPanel({ topicName }: MetadataPanelProps) {
  const [metadata, setMetadata] = useState<TopicMetadata | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    mockService.getTopicMetadata(topicName).then(data => setMetadata(data));
  }, [topicName]);

  const handleSave = async () => {
    if (!metadata) return;
    setIsSaving(true);
    await mockService.updateTopicMetadata(metadata);
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (!metadata) return null;

  return (
    <Card className="glass-card border-border/10 rounded-[2.5rem] overflow-hidden">
      <CardHeader className="p-8 border-b border-border/5 bg-secondary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tighter uppercase mr-4">Topic Enrichment</CardTitle>
              <CardDescription className="font-bold opacity-60 uppercase text-[9px] tracking-widest mt-1">Metadata & Ownership Lifecycle</CardDescription>
            </div>
          </div>
          <AnimatePresence>
            {showSuccess && (
              <m.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Saved</span>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Owner Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
              <User className="w-3 h-3" /> Data Owner
            </label>
            <Input 
              value={metadata.owner}
              onChange={(e) => setMetadata({ ...metadata, owner: e.target.value })}
              className="h-12 bg-secondary/30 border-border/10 rounded-2xl text-sm font-bold focus:ring-primary/20"
              placeholder="e.g. Payments Team"
            />
          </div>

          {/* Environment */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
              <Globe className="w-3 h-3" /> Deployment Realm
            </label>
            <Select
              value={metadata.environment}
              onChange={(val) => setMetadata({ ...metadata, environment: val as any })}
              options={[
                { value: "Dev", label: "DEVELOPMENT" },
                { value: "Staging", label: "STAGING" },
                { value: "Prod", label: "PRODUCTION" }
              ]}
              className="h-12 bg-secondary/30 border-border/10 rounded-2xl text-sm font-bold"
            />
          </div>

          {/* Sensitivity */}
          <div className="space-y-3 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> Data Sensitivity Profile
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["Public", "Internal", "PII"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setMetadata({ ...metadata, sensitivity: level })}
                  className={`h-12 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all border ${
                    metadata.sensitivity === level
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                      : "bg-secondary/30 text-muted-foreground border-border/10 hover:border-primary/30"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleSave}
            isLoading={isSaving}
            className="w-full h-14 rounded-3xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all gap-3"
          >
            <Save className="w-4 h-4" />
            Commit Metadata
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
