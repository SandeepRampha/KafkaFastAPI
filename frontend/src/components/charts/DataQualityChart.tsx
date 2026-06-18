import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function generateMockDQData() {
  return DAYS.map((day) => ({
    label: day,
    passed: Math.floor(Math.random() * 30) + 60,
    failed: Math.floor(Math.random() * 15) + 5,
  }));
}

export function DataQualityChart() {
  const [data] = useState(generateMockDQData);
  const [mounted, setMounted] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.passed + d.failed)),
    [data]
  );

  const chartHeight = 180;

  return (
    <Card className="glass-panel border-none bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-lg">
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
              Quality Score Trend
            </h3>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            7-Day
          </Badge>
        </div>

        {/* Stacked Bar Chart */}
        <div className="flex items-end gap-3" style={{ height: chartHeight }}>
          {data.map((bar, i) => {
            const total = bar.passed + bar.failed;
            const passedPx = (bar.passed / maxValue) * chartHeight;
            const failedPx = (bar.failed / maxValue) * chartHeight;
            const isHovered = hoveredIndex === i;
            const passRate = Math.round((bar.passed / total) * 100);

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 h-full justify-end relative"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {isHovered && (
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg">
                    {passRate}% pass
                  </div>
                )}
                <div className="w-full flex flex-col cursor-pointer" style={{ gap: 2 }}>
                  {/* Failed (top - red) */}
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: mounted ? failedPx : 0,
                      background: isHovered
                        ? "linear-gradient(to top, hsl(0 80% 55%), hsl(0 80% 70%))"
                        : "linear-gradient(to top, hsl(0 70% 60% / 0.7), hsl(0 70% 70% / 0.4))",
                      transform: isHovered ? "scaleX(1.15)" : "scaleX(1)",
                      transition: `height 0.6s cubic-bezier(0.33, 1, 0.68, 1) ${i * 50}ms, transform 0.2s ease`,
                    }}
                  />
                  {/* Passed (bottom - green) */}
                  <div
                    className="w-full rounded-b-md"
                    style={{
                      height: mounted ? passedPx : 0,
                      background: isHovered
                        ? "linear-gradient(to top, hsl(150 70% 40%), hsl(150 70% 55%))"
                        : "linear-gradient(to top, hsl(150 60% 45% / 0.8), hsl(150 60% 60% / 0.5))",
                      transform: isHovered ? "scaleX(1.15)" : "scaleX(1)",
                      transition: `height 0.6s cubic-bezier(0.33, 1, 0.68, 1) ${i * 50}ms, transform 0.2s ease`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground mt-1">{bar.label}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(150 60% 45%)" }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(0 70% 60%)" }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Failed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
