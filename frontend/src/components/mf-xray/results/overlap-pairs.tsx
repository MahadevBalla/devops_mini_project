// frontend/src/components/mf-xray/results/overlap-pairs.tsx
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { overlapSeverity, type OverlapPair } from "@/lib/mf-xray-types";

interface Props { pairs: OverlapPair[] }

const SEV_CONFIG = {
  red:    { dot: "bg-red-500",    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",    label: "High",   hint: "Consider: Keep the lower-cost fund, exit the other" },
  amber:  { dot: "bg-amber-500",  badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300", label: "Medium", hint: "Monitor: Acceptable but reduces diversification"    },
  yellow: { dot: "bg-yellow-500", badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",label: "Low",    hint: "Low overlap — no immediate action needed"            },
};

export function OverlapPairs({ pairs }: Props) {
  if (!pairs.length) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold">🔄 Fund Overlap</p>
        </div>
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
              No significant overlap detected ✓
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your funds cover distinct market segments — good diversification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...pairs].sort((a, b) => b.overlap_percent - a.overlap_percent);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className={cn(
        "px-5 py-4 border-b flex items-center justify-between",
        sorted[0].overlap_percent >= 65
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
          : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
      )}>
        <div>
          <p className={cn("text-sm font-bold",
            sorted[0].overlap_percent >= 65
              ? "text-red-800 dark:text-red-200"
              : "text-amber-800 dark:text-amber-200"
          )}>
            🔄 Fund Overlap Detected
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pairs.length} overlapping pair{pairs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-bold",
          sorted[0].overlap_percent >= 65
            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        )}>
          {pairs.filter(p => p.overlap_percent >= 65).length} high
        </span>
      </div>

      <div className="divide-y divide-border">
        {sorted.map((p, i) => {
          const sev = overlapSeverity(p.overlap_percent);
          const cfg = SEV_CONFIG[sev];
          return (
            <div key={i} className="px-5 py-4 space-y-3">
              {/* Pair header */}
              <div className="flex items-start gap-3">
                <div className={cn("mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0", cfg.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{p.fund_a}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <span className="text-border">↔</span>
                        <span className="truncate">{p.fund_b}</span>
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      <p className="text-base font-bold text-foreground">{p.overlap_percent.toFixed(0)}%</p>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", cfg.badge)}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Overlap bar */}
                  <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700",
                        sev === "red" ? "bg-red-500" : sev === "amber" ? "bg-amber-500" : "bg-yellow-500")}
                      style={{ width: `${p.overlap_percent}%` }}
                    />
                  </div>

                  {/* Common stocks */}
                  {p.common_stocks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.common_stocks.slice(0, 5).map((stock) => (
                        <span key={stock}
                          className="px-2 py-0.5 bg-muted rounded-full text-[10px] font-medium text-muted-foreground">
                          {stock}
                        </span>
                      ))}
                      {p.common_stocks.length > 5 && (
                        <span className="px-2 py-0.5 bg-muted rounded-full text-[10px] text-muted-foreground">
                          +{p.common_stocks.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hint */}
                  <p className="text-xs text-muted-foreground mt-2">→ {cfg.hint}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}