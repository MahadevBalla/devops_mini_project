// frontend/src/components/health-score/steps/step-protection.tsx
"use client";

import { Shield, Heart, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WizardFormState } from "@/lib/health-score-types";

interface Props {
  form: WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
}

function ToggleRow({
  value, onChange, label, children,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {[{ val: false, label: "No" }, { val: true, label: "Yes" }].map(({ val, label: lbl }) => (
            <button
              key={lbl}
              type="button"
              onClick={() => onChange(val)}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-all",
                value === val
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
      {value && children}
    </div>
  );
}

export function StepProtection({ form, onChange }: Props) {
  const income = Number(form.monthly_gross_income) || 0;
  const recommendedTermCover = income * 12 * 10;

  function patchIns(patch: Partial<typeof form.insurance>) {
    onChange({ insurance: { ...form.insurance, ...patch } });
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          Insurance gaps are the most common reason for a low score. This section is quick and has a big impact.
        </p>
      </div>

      {/* Term Life */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Term Life Insurance</p>
            <p className="text-xs text-muted-foreground">Pure protection — not investment</p>
          </div>
        </div>

        <ToggleRow
          label="Do you have a term plan?"
          value={form.insurance.has_term_life}
          onChange={(v) => patchIns({ has_term_life: v, term_cover: v ? form.insurance.term_cover : 0 })}
        >
          <div className="space-y-1.5">
            <Label htmlFor="term_cover" className="text-xs">Sum Assured (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input
                id="term_cover" type="number" placeholder="1,00,00,000" className="pl-7"
                value={form.insurance.term_cover === 0 ? "" : form.insurance.term_cover}
                onChange={(e) => patchIns({ term_cover: Number(e.target.value) || 0 })}
              />
            </div>
            {income > 0 && (
              <p className="text-xs text-muted-foreground">
                Recommended: ₹{recommendedTermCover.toLocaleString("en-IN")} (10× annual income)
                {form.insurance.term_cover > 0 && form.insurance.term_cover < recommendedTermCover && (
                  <span className="text-amber-600 ml-1">⚠ Below recommended</span>
                )}
              </p>
            )}
          </div>
        </ToggleRow>
      </div>

      {/* Health Insurance */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <Heart className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Health Insurance</p>
            <p className="text-xs text-muted-foreground">Mediclaim / floater plan</p>
          </div>
        </div>

        <ToggleRow
          label="Do you have health insurance?"
          value={form.insurance.has_health}
          onChange={(v) => patchIns({ has_health: v, health_cover: v ? form.insurance.health_cover : 0 })}
        >
          <div className="space-y-1.5">
            <Label htmlFor="health_cover" className="text-xs">Cover Amount (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input
                id="health_cover" type="number" placeholder="5,00,000" className="pl-7"
                value={form.insurance.health_cover === 0 ? "" : form.insurance.health_cover}
                onChange={(e) => patchIns({ health_cover: Number(e.target.value) || 0 })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Min recommended: ₹5,00,000 for metro cities
              {form.insurance.health_cover > 0 && form.insurance.health_cover < 500000 && (
                <span className="text-amber-600 ml-1">⚠ Consider increasing</span>
              )}
            </p>
          </div>
        </ToggleRow>
      </div>

      {/* Critical Illness */}
      <div className="bg-card border border-border rounded-xl p-5">
        <ToggleRow
          label="Critical Illness Rider / Plan"
          value={form.insurance.has_critical_illness}
          onChange={(v) => patchIns({ has_critical_illness: v })}
        >
          <p className="text-xs text-muted-foreground">Lump-sum cover on diagnosis of cancer, heart attack, etc.</p>
        </ToggleRow>
      </div>
    </div>
  );
}