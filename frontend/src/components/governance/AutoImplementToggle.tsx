import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { Zap, ZapOff, RefreshCcw } from "lucide-react";
import governanceService from "../../services/governanceService";
import { useToast } from "../../contexts/NotificationContext";
import { cn } from "../../lib/utils";

export function AutoImplementToggle() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const fetchStatus = async () => {
    try {
      const settings = await governanceService.fetchSettings();
      const autoSetting = settings.find(s => s.key === "AUTO_IMPLEMENT");
      if (autoSetting) {
        setIsEnabled(autoSetting.value.toLowerCase() === "true");
      } else {
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Failed to fetch auto-implement status:", error);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleToggle = async () => {
    if (isEnabled === null || isLoading) return;

    setIsLoading(true);
    const newValue = !isEnabled;
    try {
      await governanceService.updateSetting("AUTO_IMPLEMENT", newValue, true);
      setIsEnabled(newValue);
      toast.success(
        `Auto-Implementation ${newValue ? "Enabled" : "Disabled"}`,
        newValue
          ? "Approved requests will now be provisioned automatically."
          : "Approved requests now require manual deployment by an Admin."
      );
    } catch (error: any) {
      toast.error("Failed to update setting", error.response?.data?.detail || "System error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isEnabled === null) return null;

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 transition-all duration-500 hover:border-primary/20">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-2 w-2 rounded-full animate-pulse",
            isEnabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Orchestration
          </span>
        </div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
          {isEnabled ? "Auto-Deployment: Active" : "Manual Review Mode"}
        </h4>
      </div>

      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "relative flex h-10 w-20 items-center rounded-2xl p-1 transition-all duration-500 focus:outline-none",
          isEnabled ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" : "bg-slate-200 dark:bg-slate-800",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <m.div
          className="z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm"
          animate={{ x: isEnabled ? 40 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {isLoading ? (
            <RefreshCcw className="h-4 w-4 animate-spin text-primary" />
          ) : isEnabled ? (
            <Zap className="h-4 w-4 text-emerald-500" />
          ) : (
            <ZapOff className="h-4 w-4 text-slate-400" />
          )}
        </m.div>

        <div className="absolute inset-0 flex items-center justify-between px-3">
          <span className={cn("text-[9px] font-black tracking-widest transition-opacity duration-300", isEnabled ? "opacity-0" : "opacity-100 text-slate-500")}>OFF</span>
          <span className={cn("text-[9px] font-black tracking-widest transition-opacity duration-300", isEnabled ? "opacity-100 text-white" : "opacity-0")}>ON</span>
        </div>
      </button>
    </div>
  );
}
