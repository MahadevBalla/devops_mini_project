// frontend/src/components/couple-planner/results/sip-split.tsx
import { fmt, fmtShort, sipCorpusProjection, type CoupleResult } from "@/lib/couple-types";
import { cn } from "@/lib/utils";

interface Props {
  result: CoupleResult;
  nameA: string; nameB: string;
  avgRetirementYears: number; // pass from form
}

export function SipSplit({ result, nameA, nameB, avgRetirementYears }: Props) {
  const { partner_a_sip, partner_b_sip } = result;
  const total = partner_a_sip + partner_b_sip;
  if (total <= 0) return null;

  const pctA = total > 0 ? (partner_a_sip / total) * 100 : 50;
  const pctB = 100 - pctA;
  const corpus = sipCorpusProjection(total, avgRetirementYears);

  const rows = [
    { name: nameA, sip: partner_a_sip, pct: pctA, color: "bg-purple-500" },
    { name: nameB, sip: partner_b_sip, pct: pctB, color: "bg-rose-500" },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold">📈 Optimal Monthly SIP Split</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Proportional to each partner&apos;s investable surplus
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Combined SIP highlight */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">
            {fmt(total)}
          </span>
          <span className="text-sm text-muted-foreground">/month combined</span>
        </div>

        {/* Stacked bar */}
        <div className="h-3 rounded-full overflow-hidden flex">
          <div
            className="bg-purple-500 transition-all duration-700 rounded-l-full"
            style={{ width: `${pctA}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-700 rounded-r-full"
            style={{ width: `${pctB}%` }}
          />
        </div>

        {/* Per-partner rows */}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-3">
              {/* Bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("h-2.5 w-2.5 rounded-sm flex-shrink-0", r.color)} />
                    <span className="text-xs font-medium text-foreground">{r.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", r.color)}
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
              {/* Amount */}
              <div className="flex-shrink-0 text-right w-28">
                <p className="text-sm font-bold text-foreground">{fmt(r.sip)}</p>
                <p className="text-[11px] text-muted-foreground">/month</p>
              </div>
            </div>
          ))}
        </div>

        {/* Corpus projection */}
        {corpus > 0 && avgRetirementYears > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
            <span className="text-xl flex-shrink-0">🎯</span>
            <div>
              <p className="text-xs font-semibold text-green-800 dark:text-green-200">
                Projected corpus in {avgRetirementYears} years @ 12% CAGR
              </p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {fmtShort(corpus)}
              </p>
              <p className="text-[10px] text-green-600 dark:text-green-400">
                Indicative only — actual returns may vary
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}