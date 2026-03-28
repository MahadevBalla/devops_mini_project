// frontend/src/components/tax/results/slab-breakdown.tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildBreakdown } from "@/lib/tax-slabs";
import type { TaxResult, TaxDeductions } from "@/lib/tax-types";

interface Props {
  result: TaxResult;
  deductions: TaxDeductions;
}

// ─── Slab row ──────────────────────────────────────────────────────────────────
function SlabRow({
  label,
  rate,
  tax,
}: {
  label: string;
  rate: number;
  tax: number;
}) {
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const pct = (r: number) => `${(r * 100).toFixed(0)}%`;
  const active = tax > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-3 rounded-lg text-xs transition-colors",
        active ? "bg-muted/60 text-foreground" : "text-muted-foreground"
      )}
    >
      <span>{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground tabular-nums">{pct(rate)}</span>
        <span
          className={cn(
            "font-semibold w-24 text-right tabular-nums",
            active ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {active ? fmt(tax) : "₹0"}
        </span>
      </div>
    </div>
  );
}

// ─── Income row ────────────────────────────────────────────────────────────────
function IncomeRow({
  label,
  value,
  deduct = false,
  bold = false,
}: {
  label: string;
  value: string;
  deduct?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between text-sm",
        bold ? "font-semibold text-foreground" : "text-muted-foreground"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          deduct && "text-destructive",
          bold && "text-foreground font-semibold"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function SlabBreakdown({ result, deductions }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"old" | "new">(result.recommended_regime);

  const breakdown = buildBreakdown(result.gross_income, deductions, view);
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <div
      className="rounded-xl border border-border overflow-hidden"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between px-5 py-4 bg-surface-2 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="space-y-2.5">
          <div>
            <p className="text-sm font-semibold text-foreground">
              How was this calculated?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step-by-step breakdown for{" "}
              <span className="text-foreground font-medium">
                {view === "old" ? "Old" : "New"} Regime
              </span>
              {view === result.recommended_regime && (
                <span className="ml-1.5 text-primary font-semibold">
                  · Recommended
                </span>
              )}
            </p>
          </div>

          {/* ── Toggle pills — stop propagation so they don't collapse accordion ── */}
          <div
            className="flex gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {(["new", "old"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setView(r)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                  view === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "old" ? "Old Regime" : "New Regime"}
                {r === result.recommended_regime && (
                  <span className={cn(
                    "ml-1 text-[9px] font-bold",
                    view === r ? "opacity-80" : "text-primary"
                  )}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1 shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* ── Expandable body ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={`breakdown-${view}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-5 bg-card font-mono text-sm border-t border-border">

              {/* Income & deductions */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Income
                </p>
                <IncomeRow
                  label="Annual gross income"
                  value={fmt(breakdown.grossIncome)}
                />
                <IncomeRow
                  label="Standard deduction"
                  value={`− ${fmt(breakdown.standardDeduction)}`}
                  deduct
                />
                {breakdown.otherDeductions > 0 && (
                  <IncomeRow
                    label="80C / 80D / NPS…"
                    value={`− ${fmt(breakdown.otherDeductions)}`}
                    deduct
                  />
                )}
                <div className="border-t border-border-subtle pt-2 mt-1">
                  <IncomeRow
                    label="Taxable income"
                    value={fmt(breakdown.taxableIncome)}
                    bold
                  />
                </div>
              </div>

              {/* Slab table */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Tax by slab
                </p>
                {breakdown.slabLines.map((line, i) => (
                  <SlabRow
                    key={i}
                    label={line.label}
                    rate={line.rate}
                    tax={line.tax}
                  />
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Summary
                </p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Base tax (before cess)</span>
                  <span className="tabular-nums">{fmt(breakdown.baseTax)}</span>
                </div>
                {breakdown.surcharge > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Surcharge</span>
                    <span className="tabular-nums">{fmt(breakdown.surcharge)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Health & Education Cess (4%)</span>
                  <span className="tabular-nums">{fmt(breakdown.cess)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-sm border-t border-border pt-3 mt-1">
                  <span className="text-foreground">Total Tax Payable</span>
                  <span
                    className="text-lg tabular-nums text-primary"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {fmt(breakdown.totalTax)}
                  </span>
                </div>
              </div>

              {/* Footnote */}
              <p className="text-[10px] text-muted-foreground border-t border-border-subtle pt-3">
                Computed client-side using FY 2025-26 Finance Act constants.
                Actual liability may vary based on Form 16 figures, LTCG, perquisites, etc.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
