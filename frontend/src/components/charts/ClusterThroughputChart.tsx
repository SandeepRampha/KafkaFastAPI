import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";

function generateMockData() {
  return Array.from({ length: 15 }, (_, i) => ({
    label: `${(i * 4) % 60}m`,
    value: Math.floor(Math.random() * 60) + 30,
  }));
}

export function ClusterThroughputChart() {
  const [data, setData] = useState(generateMockData);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const next = [...prev.slice(1)];
        next.push({ label: "now", value: Math.floor(Math.random() * 60) + 30 });
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value)), [data]);

  return (
    <Card className="glass-panel border-none bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-lg">
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
              Cluster Throughput
            </h3>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest animate-pulse">
            Live
          </Badge>
        </div>

        {/* Chart */}
        <div className="flex items-end gap-[6px]" style={{ height: 200 }}>
          {data.map((bar, i) => {
            const heightPx = (bar.value / maxValue) * 200;
            const isHovered = hoveredIndex === i;
            return (
              <div
                key={i}
                className="flex-1 relative flex items-end h-full"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg">
                    {bar.value} msg/s
                  </div>
                )}
                <div
                  className="w-full rounded-t-lg cursor-pointer"
                  style={{
                    height: mounted ? heightPx : 0,
                    background: isHovered
                      ? "linear-gradient(to top, hsl(220 90% 50%), hsl(220 90% 70%))"
                      : "linear-gradient(to top, hsl(220 90% 55% / 0.8), hsl(220 90% 70% / 0.5))",
                    transform: isHovered ? "scaleX(1.15)" : "scaleX(1)",
                    transition: `height 0.6s cubic-bezier(0.33, 1, 0.68, 1) ${i * 30}ms, transform 0.2s ease, background 0.2s ease`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
