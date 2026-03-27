// frontend/src/components/mf-xray/results/xray-hero.tsx
import { cn } from "@/lib/utils";
import {
  fmtShort,
  type MFXRayResult,
} from "@/lib/mf-xray-types";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface Props { result: MFXRayResult }

export function XRayHero({ result }: Props) {
  const {
    total_invested, total_current_value,
    absolute_return_pct, overall_xirr,
    xirr_vs_benchmark, benchmark_conservative,
    benchmark_base, benchmark_optimistic,
  } = result;

  const gain = total_current_value - total_invested;
  const isPositive = gain >= 0;
  const hasXirr = overall_xirr != null;
  const beatMarket = (xirr_vs_benchmark ?? 0) > 0;

  // Benchmark bar: position XIRR on a scale from 0 to optimistic+4
  const scale = benchmark_optimistic + 4;
  const xirrPct = hasXirr
    ? Math.min(Math.max((overall_xirr! / scale) * 100, 2), 98)
    : null;
  const conservativePct = (benchmark_conservative / scale) * 100;
  const basePct = (benchmark_base / scale) * 100;
  const optimisticPct = (benchmark_optimistic / scale) * 100;

  return (
    <div className={cn(
      "rounded-xl border-2 p-6 space-y-5",
      isPositive
        ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/10 border-green-200 dark:border-green-800"
        : "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/10 border-red-200 dark:border-red-800"
    )}>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/60 dark:bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
            🔬
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Portfolio X-Ray</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.holdings.length} fund{result.holdings.length !== 1 ? "s" : ""} · <AnimatedNumber value={total_invested} format={fmtShort} /> invested
            </p>
          </div>
        </div>
        {/* Alpha badge */}
        {hasXirr && (
          <div className={cn(
            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold",
            beatMarket
              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
          )}>
            {beatMarket ? "↑" : "↓"} <AnimatedNumber value={Math.abs(xirr_vs_benchmark!)} format={(n) => `${n.toFixed(1)}%`} /> vs Nifty
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Current value */}
        <div className="bg-white/60 dark:bg-white/10 border border-white/40 dark:border-white/20 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Current Value</p>
          <p className="text-base font-bold text-foreground mt-1">
            <AnimatedNumber value={total_current_value} format={fmtShort} />
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Invested: <AnimatedNumber value={total_invested} format={fmtShort} /></p>
        </div>

        {/* P&L */}
        <div className={cn(
          "rounded-xl p-3 border",
          isPositive
            ? "bg-green-100/60 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-red-100/60 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        )}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total Gain / Loss</p>
          <p className={cn("text-base font-bold mt-1",
            isPositive ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
            {isPositive ? "+" : "-"}<AnimatedNumber value={Math.abs(gain)} format={fmtShort} />
          </p>
          <p className={cn("text-[10px] font-semibold mt-0.5",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
            {absolute_return_pct >= 0 ? "+" : ""}<AnimatedNumber value={absolute_return_pct} format={(n) => `${n.toFixed(1)}%`} />
          </p>
        </div>

        {/* XIRR */}
        <div className={cn(
          "rounded-xl p-3 border",
          hasXirr && beatMarket
            ? "bg-green-100/60 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/20"
        )}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">XIRR p.a.</p>
          <p className="text-base font-bold text-foreground mt-1">
            {hasXirr ? <AnimatedNumber value={overall_xirr!} format={(n) => `${n.toFixed(1)}%`} /> : "N/A"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {hasXirr ? `Nifty base: ${benchmark_base}%` : "Need purchase dates"}
          </p>
        </div>

        {/* Alpha */}
        <div className="bg-white/60 dark:bg-white/10 border border-white/40 dark:border-white/20 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
            Alpha vs Nifty
          </p>
          <p className={cn("text-base font-bold mt-1",
            !hasXirr ? "text-muted-foreground"
              : beatMarket ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
          )}>
            {hasXirr ? (
              <>
                {(xirr_vs_benchmark ?? 0) >= 0 ? "+" : ""}
                <AnimatedNumber value={xirr_vs_benchmark ?? 0} format={(n) => `${n.toFixed(1)}%`} />
              </>
            ) : "N/A"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {hasXirr
              ? (beatMarket ? "Outperforming 🎉" : "Underperforming")
              : "XIRR unavailable"}
          </p>
        </div>
      </div>

      {/* Benchmark band bar */}
      {hasXirr && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium">
            Nifty 50 XIRR Benchmark Band
          </p>
          <div className="relative h-4 rounded-full bg-muted overflow-hidden">
            {/* Colour zones */}
            <div className="absolute inset-y-0 left-0 bg-red-200   dark:bg-red-900/40 rounded-l-full"
              style={{ width: `${conservativePct}%` }} />
            <div className="absolute inset-y-0 bg-amber-200 dark:bg-amber-900/40"
              style={{ left: `${conservativePct}%`, width: `${basePct - conservativePct}%` }} />
            <div className="absolute inset-y-0 bg-green-200 dark:bg-green-900/40"
              style={{ left: `${basePct}%`, width: `${optimisticPct - basePct}%` }} />
            {/* Your XIRR marker */}
            {xirrPct != null && (
              <div
                className="absolute inset-y-0 w-1 bg-primary rounded-full shadow"
                style={{ left: `calc(${xirrPct}% - 2px)` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Below {benchmark_conservative}%</span>
            <span>{benchmark_conservative}–{benchmark_base}%</span>
            <span>{benchmark_base}–{benchmark_optimistic}%</span>
            <span>Above {benchmark_optimistic}%</span>
          </div>
        </div>
      )}
    </div>
  );
}