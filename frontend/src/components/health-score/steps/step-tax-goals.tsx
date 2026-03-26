// frontend/src/components/health-score/steps/step-tax-goals.tsx
"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizardFormState, Goal, GoalType } from "@/lib/health-score-types";

interface Props {
  form: WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
}

const TAX_FIELDS: {
  key: keyof WizardFormState["tax_deductions"];
  label: string;
  hint: string;
  max?: number;
}[] = [
  { key: "section_80c",       label: "80C Investments",        hint: "ELSS, PPF, LIC, EPF, NSC…",  max: 150000 },
  { key: "nps_80ccd_1b",      label: "NPS (80CCD-1B)",         hint: "Additional NPS over 80C",     max: 50000  },
  { key: "section_80d_self",  label: "Health Insurance (80D)", hint: "Premium paid for self/family", max: 50000  },
  { key: "section_80d_parents", label: "Health Ins. — Parents", hint: "Premium for parents",         max: 50000  },
  { key: "hra_claimed",       label: "HRA",                    hint: "House Rent Allowance claimed"              },
  { key: "home_loan_interest",label: "Home Loan Interest (24b)", hint: "Annual interest paid",      max: 200000 },
  { key: "other_deductions",  label: "Other Deductions",       hint: "Any other deductions"                      },
];

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "house",      label: "🏠 House"      },
  { value: "education",  label: "🎓 Education"  },
  { value: "marriage",   label: "💍 Marriage"   },
  { value: "retirement", label: "🏖 Retirement" },
  { value: "vacation",   label: "✈️ Vacation"   },
  { value: "custom",     label: "📌 Custom"     },
];

function emptyGoal(): Goal {
  return {
    type: "house",
    label: "",
    target_amount: 0,
    target_year: new Date().getFullYear() + 5,
  };
}

export function StepTaxGoals({ form, onChange }: Props) {
  const [taxExpanded, setTaxExpanded] = useState(true);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  function patchTax(key: keyof WizardFormState["tax_deductions"], val: string | boolean) {
    onChange({
      tax_deductions: {
        ...form.tax_deductions,
        [key]: typeof val === "boolean" ? val : Number(val) || 0,
      },
    });
  }

  function addGoal() {
    onChange({ goals: [...form.goals, emptyGoal()] });
  }

  function removeGoal(idx: number) {
    onChange({ goals: form.goals.filter((_, i) => i !== idx) });
  }

  function patchGoal(idx: number, patch: Partial<Goal>) {
    onChange({ goals: form.goals.map((g, i) => (i === idx ? { ...g, ...patch } : g)) });
  }

  const total80C = form.tax_deductions.section_80c;

  return (
    <div className="space-y-4">
      {/* Skip hint */}
      <div className="flex items-start gap-2 p-3 bg-muted rounded-xl">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          This step is optional. Skipping will still give you a valid score — our AI will flag any missing deductions as opportunities.
        </p>
      </div>

      {/* Tax Section */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setTaxExpanded(!taxExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
        >
          <span className="text-sm font-semibold">Tax Deductions (FY 2024-25)</span>
          {taxExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {taxExpanded && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TAX_FIELDS.map(({ key, label, hint, max }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs font-medium">{label}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                    <Input
                      type="number" placeholder="0"
                      className={cn(
                        "pl-6 h-9 text-sm",
                        max && (Number(form.tax_deductions[key]) || 0) > max
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      )}
                      value={(form.tax_deductions[key] as number) === 0 ? "" : (form.tax_deductions[key] as number)}
                      onChange={(e) => patchTax(key, e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hint}{max ? ` · Max ₹${max.toLocaleString("en-IN")}` : ""}
                  </p>
                  {max && (Number(form.tax_deductions[key]) || 0) > max && (
                    <p className="text-xs text-destructive">Exceeds limit of ₹{max.toLocaleString("en-IN")}</p>
                  )}
                </div>
              ))}
            </div>

            {/* 80C utilisation bar */}
            {total80C > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>80C utilisation</span>
                  <span>₹{total80C.toLocaleString("en-IN")} / ₹1,50,000</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      total80C >= 150000 ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.min((total80C / 150000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Senior citizen toggles */}
            <div className="flex flex-wrap gap-3">
              {[
                { key: "section_80d_self_is_senior" as const, label: "I am a senior citizen (≥60 yrs)" },
                { key: "section_80d_parents_are_senior" as const, label: "My parents are senior citizens" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => patchTax(key, !form.tax_deductions[key])}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                    form.tax_deductions[key]
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span className={cn(
                    "h-3.5 w-3.5 rounded-sm border flex items-center justify-center",
                    form.tax_deductions[key] ? "border-primary bg-primary" : "border-current"
                  )}>
                    {form.tax_deductions[key] && <span className="text-white text-[8px] leading-none">✓</span>}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Goals section */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setGoalsExpanded(!goalsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="text-left">
            <span className="text-sm font-semibold">Financial Goals</span>
            <span className="text-xs text-muted-foreground ml-2">optional</span>
          </div>
          {goalsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {goalsExpanded && (
          <div className="p-4 space-y-3">
            {form.goals.map((goal, idx) => (
              <div key={idx} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Goal {idx + 1}</span>
                  <button type="button" onClick={() => removeGoal(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {GOAL_TYPES.map((gt) => (
                    <button
                      key={gt.value}
                      type="button"
                      onClick={() => patchGoal(idx, { type: gt.value })}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                        goal.type === gt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {gt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Target Amount (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                      <Input
                        type="number" placeholder="1,00,00,000" className="pl-5 h-9 text-sm"
                        value={goal.target_amount === 0 ? "" : goal.target_amount}
                        onChange={(e) => patchGoal(idx, { target_amount: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Target Year</Label>
                    <Input
                      type="number" placeholder="2030" className="h-9 text-sm"
                      min={new Date().getFullYear() + 1} max={2075}
                      value={goal.target_year}
                      onChange={(e) => patchGoal(idx, { target_year: Number(e.target.value) || 2030 })}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addGoal} className="w-full">
              <Plus className="h-4 w-4 mr-1.5" /> Add a goal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}