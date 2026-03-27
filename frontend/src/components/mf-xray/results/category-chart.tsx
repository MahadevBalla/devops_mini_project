// frontend/src/components/mf-xray/results/category-chart.tsx
// Pure CSS conic-gradient donut — zero extra dependencies.
import { cn } from "@/lib/utils";
import { categoryColor, fmtShort, type MFXRayResult } from "@/lib/mf-xray-types";

interface Props { result: MFXRayResult }

export function CategoryChart({ result }: Props) {
  const { category_breakdown, rebalancing_suggestions, total_current_value } = result;

  const entries = Object.entries(category_breakdown)
    .sort(([, a], [, b]) => b - a);

  if (!entries.length) return null;

  // Build conic-gradient segments
  let cursor = 0;
  const segments = entries.map(([cat, val]) => {
    const pct  = total_current_value > 0 ? (val / total_current_value) * 100 : 0;
    const from = cursor;
    cursor += pct;
    return { cat, val, pct, from, to: cursor, color: categoryColor(cat) };
  });

  const gradientStops = segments
    .map((s) => `${s.color} ${s.from.toFixed(1)}% ${s.to.toFixed(1)}%`)
    .join(", ");

  // Inline warnings from rebalancing_suggestions
  const debtWarning     = rebalancing_suggestions.find((s) => s.toLowerCase().includes("debt"));
  const overFundWarning = rebalancing_suggestions.find((s) => s.toLowerCase().includes("funds —"));

  const equityPct = entries
    .filter(([c]) => !["Debt", "Liquid", "Hybrid"].includes(c))
    .reduce((sum, [, v]) => sum + v, 0) / (total_current_value || 1) * 100;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">📊 Portfolio Allocation</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            By current value · {entries.length} categories
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Equity exposure</p>
          <p className={cn("text-sm font-bold",
            equityPct > 90 ? "text-amber-600" : "text-foreground")}>
            {equityPct.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Donut */}
        <div className="flex-shrink-0 relative">
          <div
            className="h-36 w-36 rounded-full"
            style={{
              background: `conic-gradient(${gradientStops})`,
            }}
          />
          {/* Centre hole */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-card flex flex-col items-center justify-center">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-xs font-bold text-foreground">
                {fmtShort(total_current_value)}
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2">
          {segments.map(({ cat, val, pct, color }) => (
            <div key={cat} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground truncate">{cat}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {fmtShort(val)}
                    </span>
                    <span className="text-[11px] font-bold text-foreground w-10 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {/* Mini bar */}
                <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inline warnings from engine */}
      {(debtWarning || overFundWarning) && (
        <div className="px-5 pb-4 space-y-2">
          {debtWarning && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <span className="text-amber-500 text-sm flex-shrink-0">⚠</span>
              <p className="text-xs text-amber-700 dark:text-amber-300">{debtWarning}</p>
            </div>
          )}
          {overFundWarning && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <span className="text-amber-500 text-sm flex-shrink-0">⚠</span>
              <p className="text-xs text-amber-700 dark:text-amber-300">{overFundWarning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}