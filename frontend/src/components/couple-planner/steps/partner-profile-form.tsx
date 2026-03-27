// frontend/src/components/couple-planner/steps/partner-profile-form.tsx
"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn }     from "@/lib/utils";
import type { PartnerFormState, DebtItem, EmploymentType } from "@/lib/couple-types";

interface Props {
  label: string;     // "Partner A" | "Partner B"
  color: "purple" | "rose";
  form: PartnerFormState;
  onChange: (patch: Partial<PartnerFormState>) => void;
}

const EMPLOYMENT_OPTS: { value: EmploymentType; icon: string; label: string }[] = [
  { value: "salaried",      icon: "💼", label: "Salaried"      },
  { value: "self_employed", icon: "🧑‍💻", label: "Self-Employed" },
  { value: "business",      icon: "🏢", label: "Business"      },
];

// ─── Collapse section wrapper ─────────────────────────────────────────────────
function Section({
  title, badge, defaultOpen = false, children,
}: {
  title: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{title}</span>
          {badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp  className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>
      {open && <div className="px-4 py-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Inline debt adder (same pattern as life-events) ─────────────────────────
function DebtAdder({
  debts, onUpdate,
}: { debts: DebtItem[]; onUpdate: (d: DebtItem[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState<Partial<DebtItem>>({
    name: "", outstanding: 0, emi: 0, interest_rate: 0, is_secured: false,
  });

  function add() {
    if (!draft.name || !draft.outstanding) return;
    onUpdate([...debts, {
      name: draft.name!, outstanding: Number(draft.outstanding),
      emi: Number(draft.emi) || 0,
      interest_rate: Number(draft.interest_rate) || 0,
      is_secured: !!draft.is_secured,
    }]);
    setDraft({ name: "", outstanding: 0, emi: 0, interest_rate: 0, is_secured: false });
    setAdding(false);
  }

  return (
    <div className="space-y-2">
      {debts.map((d, i) => (
        <div key={i} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
          <div>
            <p className="text-xs font-medium">{d.name}</p>
            <p className="text-[11px] text-muted-foreground">
              ₹{d.outstanding.toLocaleString("en-IN")} · {d.interest_rate}% · {d.is_secured ? "Secured" : "Unsecured"}
            </p>
          </div>
          <button type="button" onClick={() => onUpdate(debts.filter((_, j) => j !== i))}
            className="text-muted-foreground hover:text-destructive transition-colors ml-3">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="bg-muted/60 rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Loan name</Label>
              <Input className="h-8 text-xs" placeholder="Credit Card / Home Loan"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Outstanding (₹)</Label>
              <Input className="h-8 text-xs" type="number" placeholder="0"
                value={draft.outstanding || ""}
                onChange={(e) => setDraft((d) => ({ ...d, outstanding: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Interest % p.a.</Label>
              <Input className="h-8 text-xs" type="number" placeholder="12"
                value={draft.interest_rate || ""}
                onChange={(e) => setDraft((d) => ({ ...d, interest_rate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monthly EMI (₹)</Label>
              <Input className="h-8 text-xs" type="number" placeholder="0"
                value={draft.emi || ""}
                onChange={(e) => setDraft((d) => ({ ...d, emi: Number(e.target.value) }))} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setDraft((d) => ({ ...d, is_secured: !d.is_secured }))}
                  className={cn("h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer",
                    draft.is_secured ? "bg-primary border-primary" : "border-border")}>
                  {draft.is_secured && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Secured</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" className="h-7 text-xs" onClick={add}>Add</Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add a debt
        </button>
      )}
    </div>
  );
}

// ─── Insurance toggle ─────────────────────────────────────────────────────────
function InsuranceRow({
  label, sub, checked, coverValue, coverPlaceholder, onToggle, onCover,
}: {
  label: string; sub: string; checked: boolean;
  coverValue: string; coverPlaceholder: string;
  onToggle: () => void; onCover: (v: string) => void;
}) {
  return (
    <div className={cn("rounded-xl border p-3 transition-all",
      checked ? "border-primary/40 bg-primary/5" : "border-border bg-card")}>
      <label className="flex items-start gap-3 cursor-pointer">
        <div onClick={onToggle} className={cn(
          "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0",
          checked ? "bg-primary border-primary" : "border-border")}>
          {checked && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold">{label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          {checked && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Cover: ₹</span>
              <Input type="number" placeholder={coverPlaceholder}
                className="h-7 text-xs w-32"
                value={coverValue}
                onChange={(e) => onCover(e.target.value)} />
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
export function PartnerProfileForm({ label, color, form, onChange }: Props) {
  const n = (v: string) => Number(v) || 0;
  const monthly = n(form.monthly_gross_income);
  const expenses = n(form.monthly_expenses);
  const surplus  = monthly - expenses;

  const accentBorder = color === "purple"
    ? "border-purple-300 dark:border-purple-700"
    : "border-rose-300 dark:border-rose-700";
  const accentBg = color === "purple"
    ? "bg-purple-50 dark:bg-purple-950/20"
    : "bg-rose-50 dark:bg-rose-950/20";
  const accentText = color === "purple"
    ? "text-purple-700 dark:text-purple-300"
    : "text-rose-700 dark:text-rose-300";

  return (
    <div className={cn("rounded-xl border-2 overflow-hidden", accentBorder)}>
      {/* Header */}
      <div className={cn("px-5 py-3 flex items-center justify-between", accentBg)}>
        <p className={cn("text-sm font-bold", accentText)}>{label}</p>
        {monthly > 0 && expenses > 0 && (
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
            surplus > 0
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/30 text-red-600"
          )}>
            {surplus > 0 ? "+" : ""}₹{surplus.toLocaleString("en-IN")} surplus
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Core: Age + City */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Age <span className="text-destructive">*</span></Label>
            <Input type="number" placeholder="28" min={18} max={70}
              value={form.age}
              onChange={(e) => onChange({ age: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>City <span className="text-destructive">*</span></Label>
            <Input placeholder="Mumbai"
              value={form.city}
              onChange={(e) => onChange({ city: e.target.value })} />
          </div>
        </div>

        {/* Employment */}
        <div className="space-y-1.5">
          <Label>Employment</Label>
          <div className="grid grid-cols-3 gap-2">
            {EMPLOYMENT_OPTS.map((opt) => {
              const sel = form.employment_type === opt.value;
              return (
                <button key={opt.value} type="button"
                  onClick={() => onChange({ employment_type: opt.value })}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-2 rounded-lg border-2 text-xs font-medium transition-all",
                    sel
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}>
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
              <Input type="number" placeholder="80,000" className="pl-7"
                value={form.monthly_gross_income}
                onChange={(e) => onChange({ monthly_gross_income: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Expenses (₹) <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input type="number" placeholder="45,000" className="pl-7"
                value={form.monthly_expenses}
                onChange={(e) => onChange({ monthly_expenses: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Emergency fund + Retirement age */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Emergency Fund (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input type="number" placeholder="2,00,000" className="pl-7"
                value={form.emergency_fund}
                onChange={(e) => onChange({ emergency_fund: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Retirement Age</Label>
            <Input type="number" placeholder="60" min={30} max={70}
              value={form.retirement_age}
              onChange={(e) => onChange({ retirement_age: e.target.value })} />
          </div>
        </div>

        {/* ── Collapsible sections ── */}

        {/* Insurance */}
        <Section title="Insurance Coverage" badge={
          form.has_term_life && form.has_health ? "✓ Covered" :
          !form.has_term_life && !form.has_health ? "⚠ Gaps" : "Partial"
        }>
          <InsuranceRow
            label="Term Life Insurance" sub="Protects dependents on death"
            checked={form.has_term_life} coverValue={form.term_cover}
            coverPlaceholder="1,00,00,000"
            onToggle={() => onChange({ has_term_life: !form.has_term_life })}
            onCover={(v) => onChange({ term_cover: v })} />
          <InsuranceRow
            label="Health / Medical Insurance" sub="Individual or floater policy"
            checked={form.has_health} coverValue={form.health_cover}
            coverPlaceholder="5,00,000"
            onToggle={() => onChange({ has_health: !form.has_health })}
            onCover={(v) => onChange({ health_cover: v })} />
        </Section>

        {/* Tax deductions */}
        <Section title="Tax Deductions (optional)" badge="Improves tax calc">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Section 80C invested (₹, max 1.5L)</Label>
              <Input type="number" placeholder="0" className="h-8"
                value={form.section_80c}
                onChange={(e) => onChange({ section_80c: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">NPS 80CCD(1B) (₹, max 50K)</Label>
              <Input type="number" placeholder="0" className="h-8"
                value={form.nps_80ccd_1b}
                onChange={(e) => onChange({ nps_80ccd_1b: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">HRA claimed (₹/year)</Label>
              <Input type="number" placeholder="0" className="h-8"
                value={form.hra_claimed}
                onChange={(e) => onChange({ hra_claimed: e.target.value })} />
            </div>
          </div>
        </Section>

        {/* Assets */}
        <Section title="Assets (optional)" badge="Improves net worth calc">
          <div className="grid grid-cols-2 gap-2">
            {[
              { field: "equity",       label: "Equity / Stocks"   },
              { field: "debt_assets",  label: "Debt / FD / Bonds" },
              { field: "ppf_epf",      label: "PPF / EPF"         },
              { field: "gold",         label: "Gold"              },
              { field: "real_estate",  label: "Real Estate"       },
              { field: "cash",         label: "Savings / Cash"    },
            ].map(({ field, label }) => (
              <div key={field} className="space-y-1">
                <Label className="text-[11px]">{label} (₹)</Label>
                <Input type="number" placeholder="0" className="h-8 text-xs"
                  value={form[field as keyof PartnerFormState] as string || ""}
                  onChange={(e) => onChange({ [field]: e.target.value } as Partial<PartnerFormState>)} />
              </div>
            ))}
          </div>
        </Section>

        {/* Debts */}
        <Section title="Existing Debts (optional)">
          <DebtAdder
            debts={form.debts}
            onUpdate={(debts) => onChange({ debts })} />
        </Section>
      </div>
    </div>
  );
}