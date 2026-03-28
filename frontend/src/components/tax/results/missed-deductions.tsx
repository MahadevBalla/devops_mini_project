// frontend/src/components/tax/results/missed-deductions.tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IndianRupee, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaxResult } from "@/lib/tax-types";

interface Props {
  result: TaxResult;
}

// ─── Metadata helpers ─────────────────────────────────────────────────────────
function getDeductionMeta(text: string): {
  eligibility: string;
  howToClaim: string;
  section: string;
} {
  const t = text.toLowerCase();

  if (t.includes("80c"))
    return {
      section: "Sec 80C",
      eligibility: "Available to all individuals. Limit ₹1,50,000/year.",
      howToClaim:
        "Invest in PPF, ELSS mutual funds, EPF top-up, NSC, or LIC premium. Submit proof to employer or declare at ITR filing.",
    };
  if (t.includes("80d") && t.includes("self"))
    return {
      section: "Sec 80D",
      eligibility:
        "Health insurance premium for yourself, spouse, and children. Limit ₹25,000 (₹50,000 if senior citizen).",
      howToClaim:
        "Pay annual health insurance premium. Submit premium receipt to employer or claim at ITR. Online payment mandatory.",
    };
  if (t.includes("80d") && t.includes("parent"))
    return {
      section: "Sec 80D",
      eligibility:
        "Parents' health insurance premium. Limit ₹25,000 (₹50,000 if parents are senior citizens).",
      howToClaim:
        "Pay parents' health insurance premium and keep the receipt. Declare at ITR filing under 80D parents column.",
    };
  if (t.includes("nps"))
    return {
      section: "Sec 80CCD(1B)",
      eligibility:
        "Additional NPS contribution over and above 80C. Limit ₹50,000/year. Over 80C limit — purely additional.",
      howToClaim:
        "Open NPS Tier-1 account via eNPS portal or your bank. Make a contribution. Download transaction statement for ITR.",
    };
  if (t.includes("hra"))
    return {
      section: "HRA Exemption",
      eligibility:
        "Salaried employees living in rented accommodation. Employer must show HRA component in salary.",
      howToClaim:
        "Submit rent receipts + landlord PAN (if annual rent > ₹1L) to your employer's HR/payroll team before March.",
    };
  if (t.includes("home loan") || t.includes("24"))
    return {
      section: "Sec 24(b)",
      eligibility:
        "Interest on home loan for self-occupied or let-out property. Limit ₹2,00,000 for self-occupied.",
      howToClaim:
        "Obtain interest certificate from your lender. Submit to employer or declare at ITR under 'Income from House Property'.",
    };
  return {
    section: "Deduction",
    eligibility: "Check with your CA for exact eligibility criteria.",
    howToClaim: "Consult your CA or tax advisor for this specific deduction.",
  };
}

function extractAmount(text: string): number | null {
  const match = text.match(/₹([\d,]+)/);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ""), 10);
}

// ─── Single deduction card ────────────────────────────────────────────────────
function DeductionCard({
  text,
  index,
}: {
  text: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const amount = extractAmount(text);
  const isHighPriority = amount !== null && amount >= 25_000;
  const meta = getDeductionMeta(text);
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
        opacity: { delay: index * 0.07, duration: 0.35 },
        y: { delay: index * 0.07, duration: 0.35 },
      }}
      className={cn(
        "rounded-xl overflow-hidden border transition-colors duration-200",
        open
          ? "border-primary/30 bg-primary-subtle"
          : "border-border bg-card hover:border-border-strong"
      )}
    >
      {/* ── Collapsed row (always visible) ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Priority icon */}
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
            isHighPriority
              ? "bg-warning/15"
              : "bg-muted"
          )}
        >
          <AlertCircle
            className={cn(
              "h-3.5 w-3.5",
              isHighPriority ? "text-warning" : "text-muted-foreground"
            )}
          />
        </div>

        {/* Main text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug truncate">
            {text}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {meta.section}
            {isHighPriority && (
              <span
                className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  background: "var(--warning-subtle)",
                  color: "var(--warning)",
                }}
              >
                HIGH PRIORITY
              </span>
            )}
          </p>
        </div>

        {/* Amount badge */}
        {amount !== null && (
          <div
            className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full tabular-nums"
            style={{
              background: isHighPriority
                ? "var(--warning-subtle)"
                : "var(--primary-subtle)",
              color: isHighPriority ? "var(--warning)" : "var(--primary)",
              border: `1px solid ${isHighPriority ? "oklch(0.72 0.17 78 / 0.20)" : "var(--primary-muted)"}`,
            }}
          >
            {fmt(amount)}
          </div>
        )}

        {/* Chevron */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 ml-1"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* ── Expanded content ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              className="mx-4 mb-4 rounded-xl p-4 space-y-3"
              style={{
                background: "var(--surface-3)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {/* Eligibility */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Eligibility
                </p>
                <p className="text-xs text-foreground leading-relaxed">
                  {meta.eligibility}
                </p>
              </div>

              {/* How to claim */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  How to claim
                </p>
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className="h-3.5 w-3.5 mt-0.5 shrink-0"
                    style={{ color: "var(--success)" }}
                  />
                  <p className="text-xs text-foreground leading-relaxed">
                    {meta.howToClaim}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function MissedDeductions({ result }: Readonly<Props>) {
  if (!result.missing_deductions.length) return null;

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const potentialTaxSaved =
    result.recommended_regime === "old"
      ? Math.round(result.deduction_potential * 0.3 * 1.04)
      : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl px-5 py-4 flex items-start gap-3"
        style={{
          background: "var(--warning-subtle)",
          border: "1px solid oklch(0.72 0.17 78 / 0.25)",
        }}
      >
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: "oklch(0.72 0.17 78 / 0.15)",
            border: "1px solid oklch(0.72 0.17 78 / 0.25)",
          }}
        >
          <IndianRupee className="h-4 w-4" style={{ color: "var(--warning)" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--warning)" }}>
            {fmt(result.deduction_potential)} in unused deductions detected
          </p>
          {potentialTaxSaved > 0 && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.72 0.17 78 / 0.85)" }}
            >
              Claiming these could save ~{fmt(potentialTaxSaved)} in additional
              tax · click each card to see how
            </p>
          )}
        </div>
      </motion.div>

      {/* Cards */}
      <div className="space-y-2">
        {result.missing_deductions.map((text, i) => (
          <DeductionCard key={i} text={text} index={i} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-muted-foreground px-1">
        These deductions only apply under the{" "}
        <strong className="text-foreground">Old Regime</strong>. If New Regime
        is recommended, claiming them may shift the balance — recalculate after
        investing.
      </p>
    </div>
  );
}
