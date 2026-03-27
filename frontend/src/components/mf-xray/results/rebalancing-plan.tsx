// frontend/src/components/mf-xray/results/rebalancing-plan.tsx
interface Props { suggestions: string[] }

export function RebalancingPlan({ suggestions }: Props) {
  if (!suggestions.length) return null;

  // Categorise each suggestion for a priority icon
  function icon(s: string): string {
    const t = s.toLowerCase();
    if (t.includes("funds —") || t.includes("simplify")) return "📦";
    if (t.includes("overlap") || t.includes("consolidate"))  return "🔄";
    if (t.includes("expense") || t.includes("direct plan"))  return "💸";
    if (t.includes("regular plan") || t.includes("direct"))  return "💸";
    if (t.includes("debt") || t.includes("short-duration"))  return "🛡️";
    if (t.includes("index") || t.includes("nifty"))          return "📈";
    return "✅";
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 bg-muted/40 border-b border-border">
        <p className="text-sm font-bold text-foreground">🔧 Rebalancing Action Plan</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {suggestions.length} action{suggestions.length !== 1 ? "s" : ""} · Do them in this order
        </p>
      </div>

      <div className="px-5 py-2">
        {suggestions.map((s, i) => {
          const isLast = i === suggestions.length - 1;
          return (
            <div key={i} className="flex gap-4 py-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {!isLast && (
                  <div className="w-0.5 bg-border flex-1 mt-1" style={{ minHeight: "1.5rem" }} />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5 pb-1">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 text-sm leading-none mt-0.5">{icon(s)}</span>
                  <p className="text-sm text-foreground leading-relaxed">{s}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}