// frontend/src/components/couple-planner/results/tax-panel.tsx
import { fmt, type CoupleResult } from "@/lib/couple-types";

interface Props {
  result: CoupleResult;
  nameA: string; nameB: string;
}

export function TaxPanel({ result, nameA, nameB }: Props) {
  const { joint_tax_saving, nps_matching_benefit } = result;
  if (joint_tax_saving <= 0 && nps_matching_benefit <= 0) return null;

  const items = [
    joint_tax_saving > 0 && {
      emoji: "📋",
      title: "Deduction Headroom",
      value: fmt(joint_tax_saving),
      sub: "If both partners fully utilise 80C · 80D · NPS",
      detail: `${nameA} and ${nameB} can save ${fmt(joint_tax_saving)} more per year by maxing available deductions under old regime.`,
      color: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20",
      valueColor: "text-blue-700 dark:text-blue-300",
    },
    nps_matching_benefit > 0 && {
      emoji: "🏦",
      title: "NPS 80CCD(1B) Benefit",
      value: fmt(nps_matching_benefit),
      sub: "₹50,000 extra deduction each · 31.2% tax saving",
      detail: `If both ${nameA} and ${nameB} each contribute ₹50,000 to NPS under 80CCD(1B), combined saving is ${fmt(nps_matching_benefit)}/year.`,
      color: "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20",
      valueColor: "text-indigo-700 dark:text-indigo-300",
    },
  ].filter(Boolean) as {
    emoji: string; title: string; value: string; sub: string;
    detail: string; color: string; valueColor: string;
  }[];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold">🧾 Joint Tax Optimisation</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total potential saving:{" "}
          <strong className="text-green-600">
            {fmt(joint_tax_saving + nps_matching_benefit)}/year
          </strong>
        </p>
      </div>

      <div className="divide-y divide-border">
        {items.map((item, i) => (
          <div key={i} className="px-5 py-4 space-y-2">
            <div className={`rounded-xl border p-4 space-y-2 ${item.color}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>{item.emoji}</span> {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className={`text-base font-bold ${item.valueColor}`}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">/year</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}