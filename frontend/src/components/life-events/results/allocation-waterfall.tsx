// frontend/src/components/life-events/results/allocation-waterfall.tsx

import { cn } from "@/lib/utils";
import { EVENT_META, type LifeEventResult } from "@/lib/life-event-types";

interface Props { result: LifeEventResult; }

const CATEGORY_ICONS: Record<string, string> = {
  "Debt Payoff":                      "🚨",
  "Debt Clearance":                   "🚨",
  "Emergency Fund":                   "🛡️",
  "Enhanced Emergency Fund":          "🛡️",
  "Tax-Saving Investment (80C)":      "📉",
  "Long-term Equity Investment":      "📈",
  "Wealth Building (Lump Sum + STP)": "📈",
  "Term Insurance Premium":           "🛡️",
  "Child Education Fund":             "🎓",
  "Down Payment":                     "🏡",
  "Registration + Stamp Duty":        "📄",
};

const CATEGORY_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-indigo-500",
];

function getIcon(category: string): string {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (category.toLowerCase().includes(key.toLowerCase().split(" ")[0].toLowerCase()))
      return icon;
  }
  return "💰";
}

export function AllocationWaterfall({ result }: Props) {
  if (!result.allocations.length) return null;

  const meta  = EVENT_META[result.event_type];
  const total = result.allocations.reduce((s, a) => s + a.amount, 0);
  const fmt   = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  // Build donut using conic-gradient — no library needed
  let cumulativePct = 0;
  const donutSegments = result.allocations.map((a, i) => {
    const pct = (a.amount / total) * 100;
    const start = cumulativePct;
    cumulativePct += pct;
    return { ...a, pct, start, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
  });

  const donutGradient = donutSegments
    .map((s) => {
      const color = s.color
        .replace("bg-red-500", "#ef4444")
        .replace("bg-blue-500", "#3b82f6")
        .replace("bg-green-500", "#22c55e")
        .replace("bg-purple-500", "#a855f7")
        .replace("bg-amber-500", "#f59e0b")
        .replace("bg-indigo-500", "#6366f1");
      return `${color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`;
    })
    .join(", ");

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold">
          {meta.emoji} Recommended Allocation
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total: {fmt(total)}
          {result.tax_impact > 0 && (
            <span className="ml-2 text-red-600">
              · After tax: {fmt(total - result.tax_impact)}
            </span>
          )}
        </p>
      </div>

      {/* Donut + legend row */}
      <div className="px-5 py-4 flex items-center gap-6">
        {/* Mini donut */}
        <div className="flex-shrink-0 relative h-20 w-20">
          <div
            className="h-20 w-20 rounded-full"
            style={{
              background: `conic-gradient(${donutGradient})`,
            }}
          />
          {/* Hole */}
          <div className="absolute inset-[22%] rounded-full bg-card flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted-foreground">
              {result.allocations.length}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {donutSegments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className={cn("h-2 w-2 rounded-sm flex-shrink-0", s.color)} />
              <span className="text-muted-foreground truncate flex-1">{s.category}</span>
              <span className="font-semibold text-foreground flex-shrink-0">
                {s.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Waterfall rows */}
      <div className="divide-y divide-border">
        {donutSegments.map((alloc, i) => {
          const pct = (alloc.amount / total) * 100;
          return (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl flex-shrink-0">{getIcon(alloc.category)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {alloc.category}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {alloc.rationale}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">{fmt(alloc.amount)}</p>
                  <p className="text-[11px] text-muted-foreground">{pct.toFixed(0)}%</p>
                </div>
              </div>

              {/* Proportional bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", alloc.color)}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}