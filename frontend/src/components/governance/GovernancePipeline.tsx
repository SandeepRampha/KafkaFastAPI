import { m } from "framer-motion";
import { Check, Clock, Eye, Settings, AlertCircle, XOctagon } from "lucide-react";
import { GovernanceStatus } from "../../services/governanceService";
import { cn } from "../../lib/utils";

interface GovernancePipelineProps {
  status: GovernanceStatus;
  className?: string;
}

const steps = [
  { 
    id: GovernanceStatus.REQUESTED, 
    label: "Requested", 
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  { 
    id: GovernanceStatus.UNDER_REVIEW, 
    label: "Under Review", 
    icon: Eye,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  { 
    id: GovernanceStatus.APPROVED, 
    label: "Approved", 
    icon: Check,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  { 
    id: GovernanceStatus.IMPLEMENTED, 
    label: "Implemented", 
    icon: Settings,
    color: "text-violet-500",
    bg: "bg-violet-500/10"
  }
];

export function GovernancePipeline({ status, className }: GovernancePipelineProps) {
  // Determine current step index
  let currentIndex = 0;
  if (status === GovernanceStatus.UNDER_REVIEW) currentIndex = 1;
  else if (status === GovernanceStatus.APPROVED) currentIndex = 2;
  else if (status === GovernanceStatus.IMPLEMENTED) currentIndex = 3;
  else if (status === GovernanceStatus.REJECTED || status === GovernanceStatus.IMPLEMENTATION_FAILED) {
      // Special handling for failures later if needed
  }

  // Handle failure states
  const isFailed = status === GovernanceStatus.REJECTED;
  const isError = status === GovernanceStatus.IMPLEMENTATION_FAILED;

  return (
    <div className={cn("flex items-center gap-2 w-full max-w-2xl py-6", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex || (status === GovernanceStatus.IMPLEMENTED && index === 3);
        const isCurrent = index === currentIndex && !isFailed && !isError;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex-1 flex items-center group relative">
            {/* Step Circle */}
            <m.div
              initial={false}
              animate={{
                scale: isCurrent ? 1.1 : 1,
                opacity: 1
              }}
              className={cn(
                "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 transition-colors duration-300",
                isCompleted 
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : isCurrent
                    ? "border-primary bg-primary/10 text-primary animate-pulse shadow-xl shadow-primary/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400"
              )}
            >
              {isCompleted ? (
                <Check className="h-5 w-5 stroke-[3]" />
              ) : (
                <Icon className={cn("h-5 w-5", isCurrent && "animate-spin-slow")} />
              )}

              {/* Tooltip Label */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md pointer-events-none">
                {step.label}
              </div>
            </m.div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2 relative h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <m.div 
                  initial={{ width: 0 }}
                  animate={{ 
                    width: isCompleted ? "100%" : isCurrent ? "50%" : "0%"
                  }}
                  className={cn(
                    "h-full transition-all duration-700",
                    isCompleted ? "bg-emerald-500" : "bg-primary"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Special status for failure */}
      {(isFailed || isError) && (
        <m.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
                "ml-4 flex items-center gap-3 px-4 py-2 rounded-2xl border-2",
                isFailed ? "border-red-500 bg-red-500/10 text-red-600" : "border-amber-500 bg-amber-500/10 text-amber-600"
            )}
        >
            {isFailed ? <XOctagon className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                {isFailed ? "Request Rejected" : "Deploy Failed"}
            </span>
        </m.div>
      )}
    </div>
  );
}
