// frontend/src/components/mf-xray/results/holdings-table.tsx
"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fmt, fmtShort, fmtPct,
  holdingGain, holdingGainPct, expenseDrag,
  categoryColor, type MFHolding,
} from "@/lib/mf-xray-types";

interface Props {
  holdings: MFHolding[];
  highExpenseFunds: string[];
}

type SortKey = "gain" | "invested" | "current" | "name";

export function HoldingsTable({ holdings, highExpenseFunds }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("gain");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...holdings].sort((a, b) => {
    let diff = 0;
    if (sortKey === "gain")    diff = holdingGainPct(a) - holdingGainPct(b);
    if (sortKey === "invested") diff = a.invested_amount - b.invested_amount;
    if (sortKey === "current") diff = a.current_value - b.current_value;
    if (sortKey === "name")    diff = a.scheme_name.localeCompare(b.scheme_name);
    return sortDir === "desc" ? -diff : diff;
  });

  const isHighExpense = (name: string) =>
    highExpenseFunds.some((f) => f.startsWith(name.split(" ")[0]));

  function SortBtn({ col }: { col: SortKey }) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
      >
        <ArrowUpDown className={cn("h-3 w-3",
          sortKey === col ? "text-primary" : "text-muted-foreground")} />
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">📋 Fund Holdings</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {holdings.length} fund{holdings.length !== 1 ? "s" : ""}
            {highExpenseFunds.length > 0 &&
              ` · ${highExpenseFunds.length} high-cost ⚠`}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground hidden sm:block">⚠ = TER &gt; 1%</p>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-[38%]">
                <div className="flex items-center gap-1">Fund <SortBtn col="name" /></div>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Category
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                <div className="flex items-center justify-end gap-1">Invested <SortBtn col="invested" /></div>
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                <div className="flex items-center justify-end gap-1">Current <SortBtn col="current" /></div>
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                <div className="flex items-center justify-end gap-1">Gain <SortBtn col="gain" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((h, i) => {
              const gain    = holdingGain(h);
              const gainPct = holdingGainPct(h);
              const isPos   = gain >= 0;
              const isHigh  = isHighExpense(h.scheme_name);
              const drag    = expenseDrag(h);

              return (
                <tr key={h.isin || i}
                  className={cn("transition-colors",
                    isHigh ? "bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/80 dark:hover:bg-amber-950/20"
                           : "hover:bg-muted/30")}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {isHigh && (
                        <span className="mt-0.5 flex-shrink-0 text-amber-500 text-xs" title="High expense ratio">⚠</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                          {h.scheme_name}
                        </p>
                        {h.expense_ratio != null && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            TER: {h.expense_ratio.toFixed(2)}%
                            {drag != null && (
                              <span className="text-amber-600 dark:text-amber-400">
                                {" "}· drag ₹{drag.toLocaleString("en-IN")}/yr
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: categoryColor(h.category) }}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{h.category || "—"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <p className="text-xs text-foreground font-medium">{fmtShort(h.invested_amount)}</p>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <p className="text-xs text-foreground font-medium">{fmtShort(h.current_value)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={cn("text-xs font-bold",
                      isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                      {isPos ? "+" : ""}{fmtShort(Math.abs(gain))}
                    </p>
                    <p className={cn("text-[10px] font-semibold mt-0.5",
                      isPos ? "text-green-500" : "text-red-500")}>
                      {fmtPct(gainPct, 1)}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="sm:hidden divide-y divide-border">
        {sorted.map((h, i) => {
          const gain    = holdingGain(h);
          const gainPct = holdingGainPct(h);
          const isPos   = gain >= 0;
          const isHigh  = isHighExpense(h.scheme_name);
          return (
            <div key={h.isin || i}
              className={cn("px-4 py-3.5",
                isHigh ? "bg-amber-50/40 dark:bg-amber-950/10" : "")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div
                      className="h-2 w-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: categoryColor(h.category) }}
                    />
                    <span className="text-[10px] text-muted-foreground">{h.category}</span>
                    {isHigh && <span className="text-amber-500 text-xs">⚠</span>}
                  </div>
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {h.scheme_name}
                  </p>
                  {h.expense_ratio != null && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      TER: {h.expense_ratio.toFixed(2)}%
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-sm font-bold",
                    isPos ? "text-green-600" : "text-red-600")}>
                    {isPos ? "+" : ""}{fmtShort(Math.abs(gain))}
                  </p>
                  <p className={cn("text-[10px] font-semibold",
                    isPos ? "text-green-500" : "text-red-500")}>
                    {fmtPct(gainPct, 1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {fmtShort(h.current_value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}