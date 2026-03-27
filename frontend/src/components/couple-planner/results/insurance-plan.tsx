// frontend/src/components/couple-planner/results/insurance-plan.tsx
import { ShieldCheck, AlertTriangle, AlertCircle } from "lucide-react";
import { parseInsuranceRecs, type CoupleResult } from "@/lib/couple-types";
import { cn } from "@/lib/utils";

interface Props { result: CoupleResult; nameA: string; nameB: string; }

function getSeverity(text: string): "ok" | "critical" | "warning" {
  const t = text.toLowerCase();
  if (t.includes("adequate") || t.includes("review sum")) return "ok";
  if (t.includes("needs") && t.includes("term")) return "critical";
  return "warning";
}

function getHint(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("term cover")) return "Buy on Policybazaar or HDFC Life — takes 10 mins online";
  if (t.includes("family floater")) return "A ₹10L family floater is cheaper than two ₹5L individual policies";
  return "Consult a SEBI-registered insurance advisor";
}

export function InsurancePlan({ result, nameA, nameB }: Props) {
  const rec = result.joint_insurance_recommendation;
  const items = parseInsuranceRecs(rec);

  // Replace "Partner A" / "Partner B" with real names in text
  const personalise = (s: string) =>
    s.replace(/Partner A/gi, nameA || "Partner A")
     .replace(/Partner B/gi, nameB || "Partner B");

  const allOk = items.length === 1 && getSeverity(items[0]) === "ok";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className={cn(
        "px-5 py-4 flex items-start gap-3 border-b",
        allOk
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
      )}>
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
          allOk
            ? "bg-green-100 dark:bg-green-900/40"
            : "bg-red-100 dark:bg-red-900/40"
        )}>
          {allOk
            ? <ShieldCheck className="h-4 w-4 text-green-600" />
            : <AlertTriangle className="h-4 w-4 text-red-600" />
          }
        </div>
        <div>
          <p className={cn(
            "text-sm font-bold",
            allOk ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
          )}>
            🛡️ {allOk ? "Insurance Adequate" : `Insurance Gaps — ${items.filter(i => getSeverity(i) === "critical").length} Critical`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allOk
              ? "Review sum assured annually as income grows"
              : "Address these before making investments"
            }
          </p>
        </div>
      </div>

      {allOk ? (
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">{personalise(items[0])}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item, i) => {
            const sev  = getSeverity(item);
            const hint = getHint(item);
            const isCrit = sev === "critical";
            return (
              <div key={i} className="px-5 py-4 flex items-start gap-3">
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  isCrit
                    ? "bg-red-100 dark:bg-red-900/40"
                    : "bg-amber-100 dark:bg-amber-900/40"
                )}>
                  <AlertCircle className={cn("h-3.5 w-3.5",
                    isCrit ? "text-red-600" : "text-amber-600")} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-foreground leading-relaxed flex-1">
                      {personalise(item)}
                    </p>
                    <span className={cn(
                      "flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold",
                      isCrit
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
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
      )}
    </div>
  );
}