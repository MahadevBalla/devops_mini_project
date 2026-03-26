// frontend/src/components/health-score/steps/step-basics.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WizardFormState, EmploymentType, RiskProfile } from "@/lib/health-score-types";

interface Props {
  form: WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
}

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string; desc: string }[] = [
  { value: "salaried",      label: "Salaried",      desc: "Full-time employee" },
  { value: "self_employed", label: "Self-Employed",  desc: "Freelancer / consultant" },
  { value: "business",      label: "Business",       desc: "Business owner" },
];

const RISK_OPTIONS: { value: RiskProfile; label: string; desc: string; color: string }[] = [
  { value: "conservative", label: "Conservative", desc: "I prefer safety over returns",    color: "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
  { value: "moderate",     label: "Moderate",     desc: "Balanced risk & returns",          color: "border-purple-400 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300" },
  { value: "aggressive",   label: "Aggressive",   desc: "I can handle market volatility",  color: "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" },
];

export function StepBasics({ form, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Age + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="age">Age <span className="text-destructive">*</span></Label>
          <Input
            id="age" type="number" placeholder="28" min={18} max={70}
            value={form.age}
            onChange={(e) => onChange({ age: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Between 18 and 70</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
          <Input
            id="city" placeholder="Mumbai" minLength={2}
            value={form.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </div>
      </div>

      {/* Retirement Age */}
      <div className="space-y-1.5">
        <Label htmlFor="retirement_age">Target Retirement Age</Label>
        <Input
          id="retirement_age" type="number" placeholder="60" min={30} max={70}
          value={form.retirement_age}
          onChange={(e) => onChange({ retirement_age: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Used for Retirement Readiness scoring</p>
      </div>

      {/* Dependents stepper */}
      <div className="space-y-1.5">
        <Label>Dependents</Label>
        <p className="text-xs text-muted-foreground">Family members who depend on your income</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={() => onChange({ dependents: Math.max(0, form.dependents - 1) })}
            className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent flex items-center justify-center text-lg font-medium transition-colors"
          >
            −
          </button>
          <span className="text-lg font-semibold w-8 text-center">{form.dependents}</span>
          <button
            type="button"
            onClick={() => onChange({ dependents: Math.min(10, form.dependents + 1) })}
            className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent flex items-center justify-center text-lg font-medium transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Employment type */}
      <div className="space-y-2">
        <Label>Employment Type <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-3 gap-2">
          {EMPLOYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ employment_type: opt.value })}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl border-2 text-center transition-all text-sm",
                form.employment_type === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/40 text-muted-foreground"
              )}
            >
              <span className="font-semibold text-xs">{opt.label}</span>
              <span className="text-xs mt-0.5 leading-tight opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Risk appetite */}
      <div className="space-y-2">
        <Label>Risk Appetite <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {RISK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ risk_profile: opt.value })}
              className={cn(
                "flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all",
                form.risk_profile === opt.value
                  ? `border-2 ${opt.color}`
                  : "border-border hover:border-primary/30"
              )}
            >
              <span className="font-semibold text-sm">{opt.label}</span>
              <span className="text-xs mt-0.5 text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}