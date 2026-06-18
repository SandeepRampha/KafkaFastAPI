import { useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Upload from "lucide-react/dist/esm/icons/upload";
import FileText from "lucide-react/dist/esm/icons/file-text";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

export default function AnalyzePolicy() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<null | "success" | "warning">(null);

  const handleUpload = () => {
    setIsUploading(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsUploading(false);
      setAnalysisResult("success");
    }, 2000);
  };

  return (
    <DashboardLayout
      role={user?.role || "user"}
      title="Analyze Policy"
      description="Validate your Kafka topic settings against organizational governance standards"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="glass-panel border-none shadow-xl overflow-hidden rounded-[2.5rem]">
          <CardHeader className="p-8 text-center bg-primary/5">
            <div className="mx-auto w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter">Governance Policy Validator</CardTitle>
            <CardDescription className="text-base font-medium mt-2 max-w-lg mx-auto leading-relaxed">
              Upload your PDF/Markdown governance document or paste your policy text to ensure your configurations are compliant.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-12">
            <div 
              className={cn(
                "border-2 border-dashed border-primary/20 rounded-[2rem] p-16 text-center transition-all duration-300",
                isUploading ? "bg-primary/5 animate-pulse" : "hover:bg-primary/5 hover:border-primary/40 cursor-pointer"
              )}
              onClick={() => !isUploading && handleUpload()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-6 bg-primary/10 rounded-full">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Click to upload or drag & drop</h3>
                  <p className="text-sm text-muted-foreground font-medium mt-1">PDF, Markdown or Plain Text (Max 10MB)</p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-center">
              <Button 
                onClick={handleUpload}
                disabled={isUploading}
                className="h-14 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                {isUploading ? "Analyzing Requirements..." : "Run AI Policy Analysis"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {analysisResult && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <Card className={cn(
              "border-none rounded-[2rem] shadow-lg overflow-hidden",
              analysisResult === "success" ? "bg-emerald-500/5" : "bg-amber-500/5"
            )}>
              <CardContent className="p-8 flex items-start gap-6">
                <div className={cn(
                  "p-3 rounded-2xl shrink-0",
                  analysisResult === "success" ? "bg-emerald-500/20 text-emerald-600" : "bg-amber-500/20 text-amber-600"
                )}>
                  {analysisResult === "success" ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-black uppercase tracking-tight">AI Analysis Complete</h4>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                    {analysisResult === "success" 
                      ? "Your governance document has been parsed. The AI identifies 4 key topic requirements: Max Retentions (7 days), Min ISR (2), Cleanup Policy (Delete), and Naming Convention (Prefix: stage-*)."
                      : "We found some ambiguities in the policy regarding partition balancing. Please check page 4 of your document."}
                  </p>
                  <div className="flex gap-4 mt-6">
                    <Button variant="outline" className="h-10 rounded-xl font-bold text-xs gap-2">
                      <FileText className="w-4 h-4" />
                      View Full Report
                    </Button>
                    <Button className="h-10 rounded-xl font-bold text-xs bg-primary text-white">
                      Apply as Active Ruleset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
