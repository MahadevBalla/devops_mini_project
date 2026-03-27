// frontend/src/components/couple-planner/results/couple-hero.tsx
import { fmt, fmtShort, type CoupleResult } from "@/lib/couple-types";

interface Props {
  result: CoupleResult;
  nameA: string;
  nameB: string;
}

export function CoupleHero({ result, nameA, nameB }: Props) {
  const netWorthA_approx = result.combined_net_worth * 0.5; // visual only — engine gives combined
  const stats = [
    {
      label: "Combined Net Worth",
      value: fmtShort(result.combined_net_worth),
      sub: result.combined_net_worth > 0
        ? `${nameA} + ${nameB} combined`
        : "Add assets for full picture",
      highlight: false,
    },
    {
      label: "Monthly Surplus",
      value: `${fmt(result.combined_monthly_surplus)}/mo`,
      sub: "After EMIs & expenses",
      highlight: false,
    },
    {
      label: "Annual Tax Savings",
      value: fmt(result.joint_tax_saving),
      sub: "If deductions fully optimised",
      highlight: result.joint_tax_saving > 0,
    },
    {
      label: "HRA Savings",
      value: fmt(result.hra_savings),
      sub: "Annual with optimal routing",
      highlight: result.hra_savings > 0,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-rose-50 dark:from-purple-950/30 dark:to-rose-950/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-white/60 dark:bg-white/10 flex items-center justify-center text-3xl flex-shrink-0">
          💑
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">
            {nameA} &amp; {nameB} — Joint Financial Plan
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optimised for HRA · NPS · SIP · Tax · Insurance
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className={
              s.highlight
                ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3"
                : "bg-white/60 dark:bg-white/10 border border-white/40 dark:border-white/20 rounded-xl p-3"
            }
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
              {s.label}
            </p>
            <p className="text-base font-bold text-foreground mt-1 leading-tight">
              {s.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}