// frontend/src/components/couple-planner/steps/step-partners.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PartnerProfileForm } from "./partner-profile-form";
import type { CoupleFormState, PartnerFormState } from "@/lib/couple-types";

interface Props {
  form: CoupleFormState;
  onChange: (patch: Partial<CoupleFormState>) => void;
}

export function StepPartners({ form, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<"a" | "b">("a");

  const nameA = form.name_a || "Partner A";
  const nameB = form.name_b || "Partner B";

  const incomeA   = Number(form.partner_a.monthly_gross_income) || 0;
  const incomeB   = Number(form.partner_b.monthly_gross_income) || 0;
  const expensesA = Number(form.partner_a.monthly_expenses) || 0;
  const expensesB = Number(form.partner_b.monthly_expenses) || 0;

  const combinedIncome  = incomeA + incomeB;
  const combinedSurplus = Math.max(0, incomeA - expensesA) + Math.max(0, incomeB - expensesB);
  const savingsRate     = combinedIncome > 0
    ? ((combinedSurplus / combinedIncome) * 100).toFixed(0)
    : "—";

  return (
    <div className="space-y-4">

      {/* ── Live combined preview bar ── */}
      {combinedIncome > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-xs">
          <span className="text-muted-foreground">Combined income:</span>
          <span className="font-bold text-foreground">
            ₹{combinedIncome.toLocaleString("en-IN")}/mo
          </span>
          <span className="text-border hidden sm:block">·</span>
          <span className="text-muted-foreground">Monthly surplus:</span>
          <span className={cn(
            "font-bold",
            combinedSurplus > 0 ? "text-green-600" : "text-red-600"
          )}>
            ₹{combinedSurplus.toLocaleString("en-IN")}/mo
          </span>
          <span className="text-border hidden sm:block">·</span>
          <span className="text-muted-foreground">Savings rate:</span>
          <span className="font-bold text-foreground">{savingsRate}%</span>
        </div>
      )}

      {/* ── Desktop: side-by-side ── */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4">
        <PartnerProfileForm
          label={nameA}
          color="purple"
          form={form.partner_a}
          onChange={(p) => onChange({ partner_a: { ...form.partner_a, ...p } })}
        />
        <PartnerProfileForm
          label={nameB}
          color="rose"
          form={form.partner_b}
          onChange={(p) => onChange({ partner_b: { ...form.partner_b, ...p } })}
        />
      </div>

      {/* ── Mobile: tab switcher ── */}
      <div className="md:hidden space-y-3">
        <div className="grid grid-cols-2 bg-muted rounded-xl p-1">
          {([["a", nameA, "purple"], ["b", nameB, "rose"]] as const).map(([key, name, color]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                activeTab === key
                  ? color === "purple"
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm"
                    : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>

        {activeTab === "a" && (
          <PartnerProfileForm
            label={nameA}
            color="purple"
            form={form.partner_a}
            onChange={(p) => onChange({ partner_a: { ...form.partner_a, ...p } })}
          />
        )}
        {activeTab === "b" && (
          <PartnerProfileForm
            label={nameB}
            color="rose"
            form={form.partner_b}
            onChange={(p) => onChange({ partner_b: { ...form.partner_b, ...p } })}
          />
        )}
      </div>
    </div>
  );
}