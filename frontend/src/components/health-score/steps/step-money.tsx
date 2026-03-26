// frontend/src/components/health-score/steps/step-money.tsx
"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizardFormState, DebtItem } from "@/lib/health-score-types";

interface Props {
  form: WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
}

const ASSET_FIELDS: { key: keyof typeof EMPTY_ASSETS; label: string; hint: string }[] = [
  { key: "equity",       label: "Equity",       hint: "MF, stocks, ETFs" },
  { key: "debt",         label: "Debt",         hint: "FDs, bonds, debt MF" },
  { key: "ppf_epf",      label: "PPF / EPF",    hint: "PF balance" },
  { key: "gold",         label: "Gold",         hint: "Physical + SGB" },
  { key: "real_estate",  label: "Real Estate",  hint: "Market value (excl. home)" },
  { key: "cash",         label: "Cash / Savings", hint: "Savings A/C, liquid cash" },
  { key: "other",        label: "Other",        hint: "Crypto, angel, etc." },
];

const EMPTY_ASSETS = {
  equity: 0, debt: 0, gold: 0,
  real_estate: 0, cash: 0, ppf_epf: 0, other: 0,
};

const LOAN_PRESETS: { label: string; is_secured: boolean; rate: number }[] = [
  { label: "Home Loan",        is_secured: true,  rate: 8.5 },
  { label: "Car Loan",         is_secured: true,  rate: 9.0 },
  { label: "Education Loan",   is_secured: true,  rate: 8.0 },
  { label: "Personal Loan",    is_secured: false, rate: 14.0 },
  { label: "Credit Card Dues", is_secured: false, rate: 36.0 },
  { label: "Gold Loan",        is_secured: true,  rate: 10.0 },
  { label: "Other",            is_secured: false, rate: 12.0 },
];

function emptyDebt(): DebtItem {
  return { name: "Home Loan", outstanding: 0, emi: 0, interest_rate: 8.5, is_secured: true };
}

export function StepMoney({ form, onChange }: Props) {
  const [assetsExpanded, setAssetsExpanded] = useState(false);
  const [hasDebts, setHasDebts] = useState(form.debts.length > 0);

  const income = Number(form.monthly_gross_income) || 0;
  const expenses = Number(form.monthly_expenses) || 0;
  const surplus = income - expenses;
  const surplusColor = surplus >= 0 ? "text-green-600" : "text-destructive";

  function patchAsset(key: keyof typeof EMPTY_ASSETS, val: string) {
    onChange({ assets: { ...form.assets, [key]: Number(val) || 0 } });
  }

  function addDebt() {
    onChange({ debts: [...form.debts, emptyDebt()] });
  }

  function removeDebt(idx: number) {
    onChange({ debts: form.debts.filter((_, i) => i !== idx) });
  }

  function patchDebt(idx: number, patch: Partial<DebtItem>) {
    onChange({
      debts: form.debts.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    });
  }

  function handleDebtNameChange(idx: number, name: string) {
    const preset = LOAN_PRESETS.find((p) => p.label === name);
    if (preset) {
      patchDebt(idx, { name, is_secured: preset.is_secured, interest_rate: preset.rate });
    } else {
      patchDebt(idx, { name });
    }
  }

  function handleHasDebtsToggle(val: boolean) {
    setHasDebts(val);
    if (!val) onChange({ debts: [] });
    else if (form.debts.length === 0) onChange({ debts: [emptyDebt()] });
  }

  const totalAssets = Object.values(form.assets).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      {/* Income & Expenses */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-foreground">Income & Expenses</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="income">Monthly Income (₹) <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input
                id="income" type="number" placeholder="75,000" className="pl-7"
                value={form.monthly_gross_income}
                onChange={(e) => onChange({ monthly_gross_income: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Gross (pre-tax)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expenses">Monthly Expenses (₹) <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input
                id="expenses" type="number" placeholder="45,000" className="pl-7"
                value={form.monthly_expenses}
                onChange={(e) => onChange({ monthly_expenses: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">All spending incl. rent, food, bills</p>
          </div>
        </div>

        {/* Live surplus indicator */}
        {income > 0 && expenses > 0 && (
          <div className={cn(
            "mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
            surplus >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
          )}>
            <span className="text-muted-foreground text-xs">Monthly surplus:</span>
            <span className={surplusColor}>
              ₹{Math.abs(surplus).toLocaleString("en-IN")}{surplus < 0 ? " deficit" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Emergency Fund */}
      <div className="space-y-1.5">
        <Label htmlFor="ef">Emergency Fund (₹)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
          <Input
            id="ef" type="number" placeholder="1,50,000" className="pl-7"
            value={form.emergency_fund}
            onChange={(e) => onChange({ emergency_fund: e.target.value })}
          />
        </div>
        {expenses > 0 && (
          <p className="text-xs text-muted-foreground">
            Recommended: ₹{(expenses * 6).toLocaleString("en-IN")} (6 months of expenses)
          </p>
        )}
      </div>

      {/* Assets accordion */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setAssetsExpanded(!assetsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <div>
            <span className="text-sm font-semibold">Investments & Assets</span>
            <span className="text-xs text-muted-foreground ml-2">
              {totalAssets > 0
                ? `₹${totalAssets.toLocaleString("en-IN")} entered`
                : "optional — improves your score significantly"}
            </span>
          </div>
          {assetsExpanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {assetsExpanded && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ASSET_FIELDS.map(({ key, label, hint }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                  <Input
                    type="number" placeholder="0" className="pl-6 h-9 text-sm"
                    value={form.assets[key] === 0 ? "" : form.assets[key]}
                    onChange={(e) => patchAsset(key, e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Loans & EMIs</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Any outstanding loans or EMIs?</p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {[{ val: false, label: "No" }, { val: true, label: "Yes" }].map(({ val, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleHasDebtsToggle(val)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-all",
                  hasDebts === val
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {hasDebts && (
          <div className="space-y-3">
            {form.debts.map((debt, idx) => (
              <div key={idx} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Loan {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDebt(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Loan type selector */}
                <div className="flex flex-wrap gap-1.5">
                  {LOAN_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleDebtNameChange(idx, p.label)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                        debt.name === p.label
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Outstanding (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                      <Input
                        type="number" placeholder="30,00,000" className="pl-5 h-9 text-sm"
                        value={debt.outstanding === 0 ? "" : debt.outstanding}
                        onChange={(e) => patchDebt(idx, { outstanding: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly EMI (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                      <Input
                        type="number" placeholder="25,000" className="pl-5 h-9 text-sm"
                        value={debt.emi === 0 ? "" : debt.emi}
                        onChange={(e) => patchDebt(idx, { emi: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Interest Rate (%)</Label>
                    <Input
                      type="number" placeholder="8.5" step="0.1" className="h-9 text-sm"
                      value={debt.interest_rate === 0 ? "" : debt.interest_rate}
                      onChange={(e) => patchDebt(idx, { interest_rate: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Type:</span>
                  {[{ val: true, label: "Secured" }, { val: false, label: "Unsecured" }].map(({ val, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => patchDebt(idx, { is_secured: val })}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                        debt.is_secured === val
                          ? val
                            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/20"
                            : "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addDebt} className="w-full">
              <Plus className="h-4 w-4 mr-1.5" /> Add another loan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}