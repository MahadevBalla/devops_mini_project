// frontend/src/components/life-events/results/insurance-gaps.tsx

import { AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { gaps: string[]; }

function getSeverity(text: string): "critical" | "important" {
  const t = text.toLowerCase();
  if (t.includes("critical") || t.includes("immediately") || t.includes("now") || t.includes("no term"))
    return "critical";
  return "important";
}

function getActionHint(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("term")) return "Compare term plans on Policybazaar or HDFC Life";
  if (t.includes("health") && t.includes("family")) return "Get a family floater — cover ₹10L+ for a family";
  if (t.includes("health")) return "Buy individual health cover — min ₹5L sum insured";
  if (t.includes("critical illness")) return "Add critical illness rider to existing term plan";
  return "Consult your insurance advisor";
}

export function InsuranceGaps({ gaps }: Props) {
  if (!gaps.length) return null;

  const criticalCount = gaps.filter((g) => getSeverity(g) === "critical").length;

  return (
    <div className="bg-card border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-red-50 dark:bg-red-950/30 px-5 py-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-red-800 dark:text-red-200">
            Insurance Gaps Detected — {gaps.length} issue{gaps.length > 1 ? "s" : ""}
          </p>
          {criticalCount > 0 && (
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              {criticalCount} critical — address these before anything else
            </p>
          )}
        </div>
      </div>

      {/* Gap items */}
      <div className="divide-y divide-border">
        {gaps.map((gap, i) => {
          const severity = getSeverity(gap);
          const hint     = getActionHint(gap);
          const isCrit   = severity === "critical";

          return (
            <div key={i} className="px-5 py-4 flex items-start gap-3">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                isCrit
                  ? "bg-red-100 dark:bg-red-900/40"
                  : "bg-amber-100 dark:bg-amber-900/40"
              )}>
                <AlertCircle className={cn(
                  "h-3.5 w-3.5",
                  isCrit ? "text-red-600" : "text-amber-600"
                )} />
              </div>

              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className="text-sm text-foreground leading-relaxed flex-1">{gap}</p>
                  <span className={cn(
                    "flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold",
                    isCrit
                      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                      : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                  )}>
                    {isCrit ? "CRITICAL" : "IMPORTANT"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">→ {hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 bg-muted/40 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          💡 Address insurance gaps <strong className="text-foreground">before</strong> making any investments.
          Insurance is the foundation of a financial plan.
        </p>
      </div>
    </div>
  );
}