// frontend/src/components/couple-planner/results/hra-block.tsx
import { Home, CheckCircle2 } from "lucide-react";
import { fmt, resolvePartnerName, type CoupleResult } from "@/lib/couple-types";

interface Props {
  result: CoupleResult;
  nameA: string; nameB: string;
}

export function HraBlock({ result, nameA, nameB }: Props) {
  const { better_hra_claimant, hra_savings } = result;
  const claimantName = resolvePartnerName(better_hra_claimant, nameA, nameB);
  const monthly = Math.round(hra_savings / 12);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
          <Home className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            🏠 HRA Claim — Route Under{" "}
            <span className="text-amber-600 dark:text-amber-400">{claimantName}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Saves {fmt(hra_savings)}/year · {fmt(monthly)}/month
          </p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Explanation */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Based on salary structure and city,{" "}
          <strong className="text-foreground">{claimantName}</strong> gets a
          higher HRA exemption. If both partners are paying rent, only one should
          claim — pick {claimantName}.
        </p>

        {/* Action callout */}
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Action Required
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Ensure {claimantName}&apos;s rent receipts &amp; landlord PAN are
              submitted to their employer <strong>before March 31</strong>.
            </p>
          </div>
        </div>

        {/* Saving chips */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Annual saving</p>
            <p className="text-base font-bold text-green-600">{fmt(hra_savings)}</p>
          </div>
          <div className="bg-muted rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Monthly equivalent</p>
            <p className="text-base font-bold text-green-600">{fmt(monthly)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}