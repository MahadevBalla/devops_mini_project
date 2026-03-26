// frontend/src/components/health-score/health-score-page.tsx
"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHealthScore } from "@/lib/finance";
import type { HealthScoreApiResponse, HealthScorePayload, WizardFormState } from "@/lib/health-score-types";
import { DEFAULT_FORM_STATE } from "@/lib/health-score-types";
import { StepBasics } from "./steps/step-basics";
import { StepMoney } from "./steps/step-money";
import { StepProtection } from "./steps/step-protection";
import { StepTaxGoals } from "./steps/step-tax-goals";
import { HealthScoreResults } from "./results/health-score-results";

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "About You",   desc: "Basic profile",      required: true  },
  { id: 2, label: "Your Money",  desc: "Income & assets",    required: true  },
  { id: 3, label: "Protection",  desc: "Insurance",          required: true  },
  { id: 4, label: "Tax & Goals", desc: "Deductions & goals", required: false },
];

// ─── Validation per step ──────────────────────────────────────────────────────

function validateStep(step: number, form: WizardFormState): string | null {
  if (step === 1) {
    if (!form.age || Number(form.age) < 18 || Number(form.age) > 70)
      return "Please enter a valid age between 18 and 70.";
    if (!form.city || form.city.trim().length < 2)
      return "Please enter your city.";
    const retAge = Number(form.retirement_age);
    if (retAge <= Number(form.age))
      return "Retirement age must be greater than your current age.";
  }
  if (step === 2) {
    if (!form.monthly_gross_income || Number(form.monthly_gross_income) <= 0)
      return "Please enter your monthly income.";
    if (!form.monthly_expenses || Number(form.monthly_expenses) <= 0)
      return "Please enter your monthly expenses.";
    if (Number(form.monthly_expenses) > Number(form.monthly_gross_income))
      return "Expenses cannot exceed income.";
  }
  return null;
}

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildPayload(form: WizardFormState): HealthScorePayload {
  return {
    age: Number(form.age),
    city: form.city.trim(),
    employment_type: form.employment_type,
    dependents: form.dependents,
    monthly_gross_income: Number(form.monthly_gross_income),
    monthly_expenses: Number(form.monthly_expenses),
    emergency_fund: Number(form.emergency_fund) || 0,
    risk_profile: form.risk_profile,
    retirement_age: Number(form.retirement_age) || 60,
    assets: form.assets,
    debts: form.debts,
    insurance: form.insurance,
    tax_deductions: form.tax_deductions,
    goals: form.goals,
  };
}

// ─── Progress stepper component ───────────────────────────────────────────────

function StepperHeader({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = current > step.id;
        const isActive = current === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(step.id)}
              className={cn(
                "flex flex-col items-center group",
                isCompleted ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isActive
                  ? "border-primary text-primary bg-background"
                  : "border-border text-muted-foreground bg-background"
              )}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.id}
              </div>
              <div className="mt-1.5 text-center hidden sm:block">
                <p className={cn("text-xs font-medium", isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{step.desc}</p>
              </div>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mx-2 transition-all",
                current > step.id ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Loading overlay with staged messages ─────────────────────────────────────

const LOADING_STAGES = [
  { label: "Validating your financial data...",   duration: 1500 },
  { label: "Running finance engine...",           duration: 2000 },
  { label: "Generating AI recommendations...",   duration: 99999 },
];

function LoadingOverlay() {
  const [stageIdx, setStageIdx] = useState(0);

  useState(() => {
    let elapsed = 0;
    LOADING_STAGES.slice(0, -1).forEach((stage, i) => {
      const timer = setTimeout(() => setStageIdx(i + 1), elapsed + stage.duration);
      elapsed += stage.duration;
      return () => clearTimeout(timer);
    });
  });

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-primary/20 animate-ping absolute" />
        <div className="h-16 w-16 rounded-full border-2 border-primary/40 flex items-center justify-center relative">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
      </div>

      {/* Staged steps */}
      <div className="space-y-2 text-center">
        {LOADING_STAGES.map((stage, i) => (
          <div key={i} className={cn("flex items-center gap-2 text-sm transition-all", i > stageIdx ? "opacity-30" : "")}>
            {i < stageIdx
              ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              : i === stageIdx
              ? <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              : <div className="h-4 w-4 rounded-full border border-border shrink-0" />}
            <span className={cn("text-sm", i === stageIdx ? "text-foreground font-medium" : "text-muted-foreground")}>
              {stage.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">This usually takes 5–8 seconds</p>
    </div>
  );
}

// ─── Review summary card ──────────────────────────────────────────────────────

function ReviewCard({
  form,
  onEdit,
}: {
  form: WizardFormState;
  onEdit: (step: number) => void;
}) {
  const income = Number(form.monthly_gross_income);
  const totalAssets = Object.values(form.assets).reduce((s, v) => s + v, 0);
  const totalEMI = form.debts.reduce((s, d) => s + d.emi, 0);
  const ins = form.insurance;

  const rows = [
    {
      label: "About You",
      step: 1,
      value: `${form.age} yr, ${form.city} · ${form.employment_type.replace("_", " ")} · ${form.risk_profile}`,
    },
    {
      label: "Income",
      step: 2,
      value: `₹${income.toLocaleString("en-IN")}/mo · savings ₹${(income - Number(form.monthly_expenses)).toLocaleString("en-IN")}/mo`,
    },
    {
      label: "Emergency Fund",
      step: 2,
      value: form.emergency_fund
        ? `₹${Number(form.emergency_fund).toLocaleString("en-IN")}`
        : "Not entered",
    },
    {
      label: "Assets",
      step: 2,
      value: totalAssets > 0 ? `₹${totalAssets.toLocaleString("en-IN")} total` : "None entered",
    },
    {
      label: "Debts",
      step: 2,
      value: form.debts.length > 0
        ? `${form.debts.length} loan(s) · EMI ₹${totalEMI.toLocaleString("en-IN")}/mo`
        : "None",
    },
    {
      label: "Insurance",
      step: 3,
      value: [
        ins.has_term_life ? `Term ₹${(ins.term_cover / 1e7).toFixed(1)}Cr ✓` : "No term ✗",
        ins.has_health ? `Health ₹${(ins.health_cover / 1e5).toFixed(0)}L ✓` : "No health ✗",
      ].join(" · "),
    },
    {
      label: "Tax Deductions",
      step: 4,
      value: form.tax_deductions.section_80c > 0
        ? `80C ₹${form.tax_deductions.section_80c.toLocaleString("en-IN")}`
        : "Not entered (will be flagged by AI)",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/50">
        <h3 className="text-sm font-semibold">Review your details</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Make sure everything looks right before calculating</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map(({ label, step, value }) => (
          <div key={label} className="flex items-center justify-between px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-sm text-foreground mt-0.5 truncate">{value}</p>
            </div>
            <button
              type="button"
              onClick={() => onEdit(step)}
              className="ml-4 text-xs text-primary hover:underline shrink-0"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function HealthScorePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormState>(DEFAULT_FORM_STATE);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HealthScoreApiResponse | null>(null);

  function patch(p: Partial<WizardFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function goNext() {
    const err = validateStep(step, form);
    if (err) { setError(err); return; }
    setError("");
    if (step === 4) { setShowReview(true); return; }
    setStep((s) => s + 1);
  }

  function goBack() {
    setError("");
    if (showReview) { setShowReview(false); return; }
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const payload = buildPayload(form);
      const res = await getHealthScore(payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setShowReview(true);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setForm(DEFAULT_FORM_STATE);
    setStep(1);
    setShowReview(false);
    setError("");
  }

  const stepLabels = ["About You", "Your Money", "Protection", "Tax & Goals"];

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">

        {/* Page header */}
        {!result && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Health Score</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Get a comprehensive 0–100 score across 6 dimensions in under a minute.
            </p>
          </div>
        )}

        {/* ── Results ── */}
        {result && <HealthScoreResults response={result} onReset={reset} />}

        {/* ── Loading ── */}
        {loading && !result && (
          <div className="bg-card border border-border rounded-xl px-8">
            <LoadingOverlay />
          </div>
        )}

        {/* ── Wizard ── */}
        {!result && !loading && (
          <div className="bg-card border border-border rounded-xl p-6">
            {/* Stepper */}
            <StepperHeader
              current={showReview ? 5 : step}
              onStepClick={(n) => { setStep(n); setShowReview(false); setError(""); }}
            />

            {/* Step title */}
            {!showReview && (
              <div className="mb-6">
                <h2 className="text-base font-semibold">
                  Step {step}: {stepLabels[step - 1]}
                  {step === 4 && <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Optional</span>}
                </h2>
              </div>
            )}

            {/* Step content */}
            {!showReview && step === 1 && <StepBasics form={form} onChange={patch} />}
            {!showReview && step === 2 && <StepMoney form={form} onChange={patch} />}
            {!showReview && step === 3 && <StepProtection form={form} onChange={patch} />}
            {!showReview && step === 4 && <StepTaxGoals form={form} onChange={patch} />}

            {/* Review */}
            {showReview && (
              <div className="space-y-5">
                <ReviewCard form={form} onEdit={(s) => { setStep(s); setShowReview(false); }} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Button
                type="button" variant="outline"
                onClick={goBack}
                disabled={step === 1 && !showReview}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>

              <div className="flex items-center gap-3">
                {/* Skip for step 4 */}
                {step === 4 && !showReview && (
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => { setError(""); setShowReview(true); }}
                    className="text-muted-foreground"
                  >
                    Skip this step
                  </Button>
                )}

                {!showReview ? (
                  <Button type="button" onClick={goNext} className="gap-1.5">
                    {step === 4 ? "Review" : "Next"} <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} size="lg" className="px-8 gap-1.5">
                    Calculate My Score <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}