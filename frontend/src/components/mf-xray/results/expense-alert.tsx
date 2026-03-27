// frontend/src/components/mf-xray/results/expense-alert.tsx
import { ShieldCheck, TrendingDown } from "lucide-react";
import { expenseDrag, type MFHolding } from "@/lib/mf-xray-types";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface Props {
  highExpenseFunds: string[];   // engine strings: "FundName: X.XX% TER — consider..."
  holdings: MFHolding[];        // to get invested_amount + actual expense_ratio
}

// Parse "Axis Small Cap Fund: 1.72% TER — consider switching to direct plan or index fund"
function parseFundString(s: string): { name: string; ter: string; advice: string } {
  const colonIdx = s.indexOf(":");
  const dashIdx  = s.indexOf(" — ");
  return {
    name:   colonIdx > -1 ? s.slice(0, colonIdx).trim()              : s,
    ter:    colonIdx > -1 && dashIdx > -1
              ? s.slice(colonIdx + 1, dashIdx).trim()
              : "",
    advice: dashIdx > -1 ? s.slice(dashIdx + 3).trim() : "",
  };
}

export function ExpenseAlert({ highExpenseFunds, holdings }: Props) {
  if (!highExpenseFunds.length) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold">💸 Expense Ratio</p>
        </div>
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
              All funds are cost-efficient ✓
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No fund exceeds the 1% TER threshold.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const parsed = highExpenseFunds.map(parseFundString);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
            💸 High Expense Ratio Alert
          </p>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            {highExpenseFunds.length} fund{highExpenseFunds.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-6">
          Switching to direct plans saves 0.5–1.5% p.a. automatically
        </p>
      </div>

      <div className="divide-y divide-border">
        {parsed.map((item, i) => {
          // Find matching holding for drag calc
          const holding = holdings.find((h) =>
            h.scheme_name.toLowerCase().startsWith(item.name.toLowerCase().slice(0, 10))
          );
          const drag     = holding ? expenseDrag(holding) : null;
          const invested = holding?.invested_amount;

          return (
            <div key={i} className="px-5 py-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  {item.ter && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                      {item.ter}
                    </p>
                  )}
                </div>
                {drag != null && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">Annual drag</p>
                    <p className="text-sm font-bold text-amber-600">
                      -₹<AnimatedNumber value={drag} format={(n) => Math.round(n).toLocaleString("en-IN")} />/yr
                    </p>
                  </div>
                )}
              </div>

              {/* Drag visualiser */}
              {drag != null && invested != null && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/10 rounded-lg space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>On ₹{(invested / 1e5).toFixed(1)}L invested</span>
                    <span className="text-amber-600 font-medium">
                      -₹<AnimatedNumber value={drag} format={(n) => Math.round(n).toLocaleString("en-IN")} />/yr
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${Math.min(((holding!.expense_ratio! - 0.7) / holding!.expense_ratio!) * 100, 90)}%` }}
                    />
                  </div>
                </div>
              )}

              {item.advice && (
                <p className="text-xs text-muted-foreground">
                  → {item.advice}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}