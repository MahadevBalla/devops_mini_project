// frontend/src/components/life-events/steps/step-event-details.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_META, type LifeEventFormState } from "@/lib/life-event-types";

interface Props {
  form: LifeEventFormState;
  onChange: (patch: Partial<LifeEventFormState>) => void;
}

const BONUS_PRESETS = [
  { label: "₹1L",  amount: "100000"  },
  { label: "₹2L",  amount: "200000"  },
  { label: "₹5L",  amount: "500000"  },
  { label: "₹10L", amount: "1000000" },
];

const PROPERTY_PRESETS = [
  { label: "₹40L", amount: "4000000"  },
  { label: "₹60L", amount: "6000000"  },
  { label: "₹80L", amount: "8000000"  },
  { label: "₹1Cr", amount: "10000000" },
];

export function StepEventDetails({ form, onChange }: Props) {
  if (!form.event_type) return null;

  const meta = EVENT_META[form.event_type];
  const num = (v: string) => Number(v) || 0;
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  // ── Windfall: bonus / inheritance ──────────────────────────────────────────
  if (meta.needsAmount) {
    const amount = num(form.event_amount);
    // Rough post-tax estimate (30% slab + 4% cess for high earners)
    const roughTax = amount > 0 ? Math.round(amount * 0.312) : 0;
    const postTax  = amount - roughTax;

    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium">
            {meta.emoji} How much did you receive?
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Enter the total amount before tax. We&apos;ll estimate the tax impact.
          </p>
        </div>

        {/* Quick presets */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quick fill →</p>
          <div className="flex flex-wrap gap-2">
            {BONUS_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange({ event_amount: p.amount })}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  form.event_amount === p.amount
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount input */}
        <div className="space-y-1.5">
          <Label>
            Amount Received (₹) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₹</span>
            <Input
              type="number"
              placeholder="5,00,000"
              className="pl-7 text-base"
              value={form.event_amount}
              onChange={(e) => onChange({ event_amount: e.target.value })}
            />
          </div>
        </div>

        {/* Live tax preview */}
        {amount > 0 && (
          <div className={cn(
            "rounded-xl border p-4 space-y-2",
            meta.heroBorder,
            `bg-gradient-to-br ${meta.heroBg}`
          )}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Live Preview
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount received</span>
                <span className="font-semibold">{fmt(amount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Approx. tax (30% + cess)</span>
                <span className="text-red-600">−{fmt(roughTax)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-white/30 pt-1.5">
                <span>Investable amount</span>
                <span className="text-green-600">{fmt(postTax)}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              * Rough estimate at 30% slab. Actual tax calculated by engine.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Home purchase ───────────────────────────────────────────────────────────
  if (meta.needsPropertyValue) {
    const propVal     = num(form.property_value);
    const downPayment = propVal * 0.20;
    const stampDuty   = propVal * 0.06; // ~6% average
    const total       = downPayment + stampDuty;

    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium">🏡 What&apos;s the property value?</p>
          <p className="text-xs text-muted-foreground mt-1">
            We&apos;ll calculate your down payment, stamp duty, and loan capacity.
          </p>
        </div>

        {/* Quick presets */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Common ranges →</p>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange({ property_value: p.amount })}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                  form.property_value === p.amount
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>
            Property Value (₹) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₹</span>
            <Input
              type="number"
              placeholder="80,00,000"
              className="pl-7 text-base"
              value={form.property_value}
              onChange={(e) => onChange({ property_value: e.target.value })}
            />
          </div>
        </div>

        {/* Live upfront cost calculator */}
        {propVal > 0 && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Upfront Cost Estimate
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Down payment (20%)</span>
                <span className="font-semibold">{fmt(downPayment)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Stamp duty + registration (~6%)</span>
                <span>{fmt(stampDuty)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-blue-200 dark:border-blue-800 pt-1.5">
                <span>Total upfront needed</span>
                <span className="text-blue-700 dark:text-blue-300">{fmt(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground border-t border-blue-200 dark:border-blue-800 pt-1.5">
                <span>Loan amount (80%)</span>
                <span>{fmt(propVal * 0.80)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Milestone events: marriage, new_baby, job_loss ──────────────────────────
  return (
    <div className="space-y-5">
      <div className={cn(
        "rounded-xl border-2 p-6 text-center space-y-4",
        meta.colorClass
      )}>
        <span className="text-5xl block">{meta.emoji}</span>
        <div>
          <p className="text-base font-bold text-foreground">{meta.label}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.isCrisis
              ? "No amount needed — we'll build your crisis survival plan from your profile."
              : "No amount needed — we'll analyse your profile and generate a personalised plan."
            }
          </p>
        </div>
        <div className="space-y-2 text-left max-w-xs mx-auto">
          {[
            meta.isCrisis
              ? "Emergency runway calculation"
              : "Insurance gap detection",
            "Priority actions for the next 30 days",
            "AI-powered personalised advice",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {meta.isCrisis && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
            ⚡ Crisis Mode
          </p>
          <p className="text-xs text-red-700 dark:text-red-300">
            Your plan will include exact month-by-month runway, what to pause,
            what to preserve, and EPFO claim steps.
          </p>
        </div>
      )}
    </div>
  );
}