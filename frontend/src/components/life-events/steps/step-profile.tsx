// frontend/src/components/life-events/steps/step-profile.tsx
"use client";

import { useState } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EVENT_META,
  type LifeEventFormState,
  type DebtItem,
} from "@/lib/life-event-types";
import type { EmploymentType } from "@/lib/health-score-types";

interface Props {
  form: LifeEventFormState;
  onChange: (patch: Partial<LifeEventFormState>) => void;
}

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string; icon: string }[] = [
  { value: "salaried",      label: "Salaried",      icon: "💼" },
  { value: "self_employed", label: "Self-Employed",  icon: "🧑‍💻" },
  { value: "business",      label: "Business",       icon: "🏢" },
];

// ─── Context banner per event ─────────────────────────────────────────────────
const CONTEXT_BANNERS: Partial<Record<string, { icon: string; text: string; color: string }>> = {
  bonus: {
    icon: "💡",
    text: "Got high-interest debt? The engine pays that first from your bonus — enter debts below for best results.",
    color: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  },
  inheritance: {
    icon: "💡",
    text: "Inheritance allocation prioritises emergency fund, then debt clearance, then wealth building — fill all sections.",
    color: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  },
  job_loss: {
    icon: "⚠️",
    text: "Your emergency fund runway = Emergency Fund ÷ Monthly Expenses. Be precise — this drives your entire crisis plan.",
    color: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  },
  marriage: {
    icon: "💍",
    text: "Your insurance coverage gaps are detected from the fields below — fill this section carefully.",
    color: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200",
  },
  new_baby: {
    icon: "👶",
    text: "Insurance gaps are critical for new parents. The engine will flag missing term life and health coverage.",
    color: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
  },
};

// ─── Inline debt adder ────────────────────────────────────────────────────────
function DebtAdder({
  debts,
  onUpdate,
}: {
  debts: DebtItem[];
  onUpdate: (debts: DebtItem[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<DebtItem>>({
    name: "", outstanding: 0, emi: 0, interest_rate: 0, is_secured: false,
  });

  function addDebt() {
    if (!draft.name || !draft.outstanding) return;
    onUpdate([
      ...debts,
      {
        name: draft.name!,
        outstanding: Number(draft.outstanding),
        emi: Number(draft.emi) || 0,
        interest_rate: Number(draft.interest_rate) || 0,
        is_secured: !!draft.is_secured,
      },
    ]);
    setDraft({ name: "", outstanding: 0, emi: 0, interest_rate: 0, is_secured: false });
    setAdding(false);
  }

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-2">
      {/* Existing debts list */}
      {debts.map((d, i) => (
        <div key={i} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
          <div>
            <p className="text-xs font-medium text-foreground">{d.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {fmt(d.outstanding)} outstanding · {d.interest_rate}% p.a.
              {d.is_secured ? " · Secured" : " · Unsecured"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdate(debts.filter((_, j) => j !== i))}
            className="text-muted-foreground hover:text-destructive transition-colors ml-3"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Add form */}
      {adding ? (
        <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold">Add a debt</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Loan name</Label>
              <Input
                placeholder="e.g. Credit Card, Personal Loan"
                className="h-8 text-xs"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Outstanding (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                className="h-8 text-xs"
                value={draft.outstanding || ""}
                onChange={(e) => setDraft((d) => ({ ...d, outstanding: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Interest rate (%)</Label>
              <Input
                type="number"
                placeholder="18"
                className="h-8 text-xs"
                value={draft.interest_rate || ""}
                onChange={(e) => setDraft((d) => ({ ...d, interest_rate: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monthly EMI (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                className="h-8 text-xs"
                value={draft.emi || ""}
                onChange={(e) => setDraft((d) => ({ ...d, emi: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-end pb-1 gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <div
                  onClick={() => setDraft((d) => ({ ...d, is_secured: !d.is_secured }))}
                  className={cn(
                    "h-4 w-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                    draft.is_secured ? "bg-primary border-primary" : "border-border"
                  )}
                >
                  {draft.is_secured && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Secured (home/car)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="h-7 text-xs" onClick={addDebt}>
              Add
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add a debt
        </button>
      )}
    </div>
  );
}

// ─── Insurance toggle ─────────────────────────────────────────────────────────
function InsuranceToggle({
  id,
  checked,
  label,
  subLabel,
  coverValue,
  coverPlaceholder,
  onToggle,
  onCoverChange,
}: {
  id: string; checked: boolean; label: string; subLabel: string;
  coverValue: string; coverPlaceholder: string;
  onToggle: () => void; onCoverChange: (v: string) => void;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3 transition-all",
      checked ? "border-primary/40 bg-primary/5" : "border-border bg-card"
    )}>
      <label className="flex items-start gap-3 cursor-pointer">
        <div
          onClick={onToggle}
          className={cn(
            "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
            checked ? "bg-primary border-primary" : "border-border"
          )}
        >
          {checked && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subLabel}</p>
          {checked && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Cover amount: ₹</span>
              <Input
                type="number"
                placeholder={coverPlaceholder}
                className="h-7 text-xs w-32"
                value={coverValue}
                onChange={(e) => onCoverChange(e.target.value)}
              />
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function StepProfile({ form, onChange }: Props) {
  const meta = form.event_type ? EVENT_META[form.event_type] : null;
  const banner = form.event_type ? CONTEXT_BANNERS[form.event_type] : null;
  const monthlyGross = Number(form.monthly_gross_income) || 0;
  const monthlyExpenses = Number(form.monthly_expenses) || 0;
  const emergencyFund = Number(form.emergency_fund) || 0;

  // Live runway chip
  const runwayMonths = monthlyExpenses > 0
    ? Math.floor(emergencyFund / monthlyExpenses)
    : null;

  const runwayColor =
    runwayMonths === null ? "" :
    runwayMonths >= 6 ? "text-green-600 bg-green-50 dark:bg-green-950/30" :
    runwayMonths >= 3 ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30" :
    "text-red-600 bg-red-50 dark:bg-red-950/30";

  return (
    <div className="space-y-5">
      {/* Context banner */}
      {banner && (
        <div className={cn("flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs", banner.color)}>
          <span className="text-base flex-shrink-0">{banner.icon}</span>
          <p>{banner.text}</p>
        </div>
      )}

      {/* Selected event chip */}
      {meta && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-base">{meta.emoji}</span>
          <span className="font-medium text-foreground">{meta.label}</span>
          <span className="opacity-40">·</span>
          <span>Financial Snapshot</span>
        </div>
      )}

      {/* Core: Age + City */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Age <span className="text-destructive">*</span></Label>
          <Input
            type="number" placeholder="30" min={18} max={80}
            value={form.age}
            onChange={(e) => onChange({ age: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>City <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Mumbai"
            value={form.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </div>
      </div>

      {/* Employment type */}
      <div className="space-y-1.5">
        <Label>Employment Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {EMPLOYMENT_OPTIONS.map((opt) => {
            const sel = form.employment_type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ employment_type: opt.value })}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all",
                  sel
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                <span>{opt.icon}</span>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Income + Expenses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Monthly Income (₹) <span className="text-destructive">*</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            <Input
              type="number" placeholder="85,000" className="pl-7"
              value={form.monthly_gross_income}
              onChange={(e) => onChange({ monthly_gross_income: e.target.value })}
            />
          </div>
          {monthlyGross > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Annual: ₹{(monthlyGross * 12).toLocaleString("en-IN")}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Monthly Expenses (₹) <span className="text-destructive">*</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
            <Input
              type="number" placeholder="50,000" className="pl-7"
              value={form.monthly_expenses}
              onChange={(e) => onChange({ monthly_expenses: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Emergency fund */}
      <div className="space-y-1.5">
        <Label>Emergency Fund (₹) <span className="text-destructive">*</span></Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
          <Input
            type="number" placeholder="3,00,000" className="pl-7"
            value={form.emergency_fund}
            onChange={(e) => onChange({ emergency_fund: e.target.value })}
          />
        </div>
        {runwayMonths !== null && (
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
              runwayColor
            )}>
              {runwayMonths < 1 ? "< 1 month" : `${runwayMonths} month${runwayMonths !== 1 ? "s" : ""}`} runway
            </span>
            {runwayMonths < 3 && (
              <span className="text-[11px] text-red-600">
                {form.event_type === "job_loss" ? "⚠️ Critical — expand immediately" : "Below safety threshold"}
              </span>
            )}
            {runwayMonths >= 6 && (
              <span className="text-[11px] text-green-600">✓ Well covered</span>
            )}
          </div>
        )}
      </div>

      {/* Insurance coverage */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label>Insurance Coverage</Label>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Important for {form.event_type === "job_loss" ? "Job Loss" :
              form.event_type === "marriage" ? "Marriage" :
              form.event_type === "new_baby" ? "New Baby" : "all events"}
          </span>
        </div>
        <div className="space-y-2">
          <InsuranceToggle
            id="term"
            checked={form.has_term_life}
            label="Term Life Insurance"
            subLabel="Covers dependents financially on your death"
            coverValue={form.term_cover}
            coverPlaceholder="1,00,00,000"
            onToggle={() => onChange({ has_term_life: !form.has_term_life })}
            onCoverChange={(v) => onChange({ term_cover: v })}
          />
          <InsuranceToggle
            id="health"
            checked={form.has_health}
            label="Health / Medical Insurance"
            subLabel="Individual or family floater policy"
            coverValue={form.health_cover}
            coverPlaceholder="5,00,000"
            onToggle={() => onChange({ has_health: !form.has_health })}
            onCoverChange={(v) => onChange({ health_cover: v })}
          />
        </div>
      </div>

      {/* Debts — shown with emphasis for bonus/inheritance */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label>Existing Debts</Label>
          {(form.event_type === "bonus" || form.event_type === "inheritance") && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
              High-interest debt paid first
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Optional. Helps the engine optimise your allocation plan.
        </p>
        <DebtAdder
          debts={form.debts}
          onUpdate={(debts) => onChange({ debts })}
        />
      </div>

      {/* Surplus hint */}
      {monthlyGross > 0 && monthlyExpenses > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-muted rounded-xl">
          <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Monthly surplus:{" "}
            <strong className={cn(
              monthlyGross - monthlyExpenses > 0 ? "text-green-600" : "text-red-600"
            )}>
              ₹{(monthlyGross - monthlyExpenses).toLocaleString("en-IN")}
            </strong>
            {" "}({(((monthlyGross - monthlyExpenses) / monthlyGross) * 100).toFixed(0)}% savings rate)
          </p>
        </div>
      )}
    </div>
  );
}