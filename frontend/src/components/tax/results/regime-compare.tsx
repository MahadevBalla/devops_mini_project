// frontend/src/components/tax/results/regime-compare.tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Check, TrendingDown, TrendingUp, IndianRupee } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { TaxResult } from "@/lib/tax-types";
import { cn } from "@/lib/utils";

interface Props {
    result: TaxResult;
}

// ─── Single regime card ────────────────────────────────────────────────────────
function RegimeCard({
    regime,
    tax,
    effectiveRate,
    isWinner,
    isRecommended,
}: {
    regime: "old" | "new";
    tax: number;
    effectiveRate: number;
    isWinner: boolean;
    isRecommended: boolean;
}) {
    const label = regime === "old" ? "Old Regime" : "New Regime";
    const stdDed = regime === "old" ? "₹50,000" : "₹75,000";

    return (
        <motion.div
            layout
            className={cn(
                "relative flex flex-col rounded-2xl border-2 overflow-hidden transition-colors duration-300",
                isWinner
                    ? "border-primary bg-primary-subtle"
                    : "border-border bg-surface-2"
            )}
            style={
                isWinner
                    ? { boxShadow: "var(--shadow-glow)" }
                    : { boxShadow: "var(--shadow-sm)" }
            }
        >
            {/* Winner badge */}
            <AnimatePresence>
                {isWinner && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-0 right-0 flex items-center gap-1 px-2.5 py-1 rounded-bl-xl text-[10px] font-bold bg-muted text-muted-foreground opacity-60 hover:opacity-100"
                    >
                        <Check className="h-2.5 w-2.5" />
                        {isRecommended ? "RECOMMENDED" : "BETTER"}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-5 flex flex-col gap-3">
                {/* Regime label */}
                <p
                    className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        isWinner ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    {label}
                </p>

                {/* Tax figure */}
                <div>
                    <div
                        className={cn(
                            "text-3xl font-bold tabular-nums leading-none",
                            isWinner ? "text-foreground" : "text-muted-foreground"
                        )}
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        <AnimatedNumber
                            value={tax}
                            format={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`}
                            duration={1.4}
                        />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Effective rate:{" "}
                        <span className="font-semibold text-foreground">
                            {effectiveRate.toFixed(2)}%
                        </span>
                    </p>
                </div>

                {/* Standard deduction pill */}
                <div className="inline-flex items-center gap-1 self-start px-2 py-1 rounded-full text-[10px] font-medium badge-primary">
                    <IndianRupee className="h-2.5 w-2.5" />
                    {stdDed} std. deduction
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function RegimeCompare({ result }: Readonly<Props>) {
    const savings = result.savings_by_switching;
    const isNewBetter = result.recommended_regime === "new";
    const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

    return (
        <div className="space-y-5">
            {/* ── Delta hero ── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-2xl px-6 py-5 text-center"
                style={{
                    background: "linear-gradient(145deg, var(--surface-1), var(--surface-2))",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-md)",
                }}
            >
                {/* Ambient glow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "var(--gradient-hero)" }}
                />
                {/* Top accent line */}
                <div
                    className="absolute top-0 inset-x-0 h-px"
                    style={{
                        background:
                            "linear-gradient(90deg, transparent, var(--primary), transparent)",
                    }}
                />

                <div className="relative">
                    <p className="text-eyebrow mb-2">You save</p>

                    <div
                        className="text-4xl sm:text-5xl font-bold tabular-nums flex items-baseline justify-center gap-1 text-gradient"
                        style={{ letterSpacing: "-0.04em" }}
                    >
                        <AnimatedNumber
                            value={savings}
                            format={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`}
                            duration={1.6}
                        />
                    </div>

                    <p className="text-sm text-muted-foreground mt-2">
                        by choosing the{" "}
                        <strong className="text-foreground">
                            {isNewBetter ? "New" : "Old"} Regime
                        </strong>{" "}
                        · that&apos;s{" "}
                        <span className="text-primary font-semibold">
                            {fmt(Math.round(savings / 12))}/month
                        </span>{" "}
                        back in your pocket
                    </p>

                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold badge-success">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {((savings / result.gross_income) * 100).toFixed(1)}% less tax
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Side-by-side cards ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-2 gap-3"
            >
                <RegimeCard
                    regime="old"
                    tax={result.old_regime_tax}
                    effectiveRate={result.effective_rate_old}
                    isWinner={result.recommended_regime === "old"}
                    isRecommended={result.recommended_regime === "old"}
                />
                <RegimeCard
                    regime="new"
                    tax={result.new_regime_tax}
                    effectiveRate={result.effective_rate_new}
                    isWinner={result.recommended_regime === "new"}
                    isRecommended={result.recommended_regime === "new"}
                />
            </motion.div>

            {/* ── Context line ── */}
            <div className="flex items-center gap-2 px-1">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                    Gross income{" "}
                    <strong className="text-foreground">{fmt(result.gross_income)}</strong>{" "}
                    · FY 2025-26 · 4% cess included · See full slab breakdown below
                </p>
            </div>
        </div>
    );
}
