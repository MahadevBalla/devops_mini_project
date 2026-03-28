// frontend/src/components/health-score/health-score-page.tsx
"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ScenarioStartGate, type ScenarioChoice } from "@/components/ui/scenario-start-gate";
import { cn } from "@/lib/utils";
import { getHealthScore } from "@/lib/finance";
import type { HealthScoreApiResponse, HealthScorePayload, WizardFormState } from "@/lib/health-score-types";
import { DEFAULT_FORM_STATE } from "@/lib/health-score-types";
import { getPortfolio, isProfileEmpty, portfolioToHealthScoreForm } from "@/lib/portfolio";
import { StepBasics } from "./steps/step-basics";
import { StepMoney } from "./steps/step-money";
import { StepProtection } from "./steps/step-protection";
import { StepTaxGoals } from "./steps/step-tax-goals";
import { HealthScoreResults } from "./results/health-score-results";
import { AnalysisLoader } from "@/components/ui/analysis-loader";

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
}: Readonly<{
  current: number;
  onStepClick: (n: number) => void;
}>) {
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


// ─── Review summary card ──────────────────────────────────────────────────────
function ReviewCard({
  form,
  onEdit,
}: Readonly<{
  form: WizardFormState;
  onEdit: (step: number) => void;
}>) {
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
  type Phase = "gate" | "wizard" | "review" | "loading" | "result";

  const [phase, setPhase] = useState<Phase>("gate");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormState>(DEFAULT_FORM_STATE);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HealthScoreApiResponse | null>(null);

  async function handleGateChoice(choice: ScenarioChoice) {
    if (choice === "portfolio") {
      try {
        const portfolio = await getPortfolio();
        if (!isProfileEmpty(portfolio)) {
          const mapped = portfolioToHealthScoreForm(
            portfolio.profile as Parameters<typeof portfolioToHealthScoreForm>[0]
          );
          setForm((f) => ({ ...f, ...mapped }));
        }
      } catch {}
    }
    setPhase("wizard");
    setStep(1);
  }

  function patch(p: Partial<WizardFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function goNext() {
    const err = validateStep(step, form);
    if (err) { setError(err); return; }
    setError("");
    if (step === 4) { setPhase("review"); return; }
    setStep((s) => s + 1);
  }

  function goBack() {
    setError("");
    if (phase === "review") { setPhase("wizard"); setStep(4); return; }
    if (step === 1) { setPhase("gate"); return; }
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    setError("");
    setPhase("loading");
    try {
      const payload = buildPayload(form);
      const res = await getHealthScore(payload);
      setResult(res);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhase("review");
    }
  }

  function reset() {
    setResult(null);
    setForm(DEFAULT_FORM_STATE);
    setStep(1);
    setError("");
    setPhase("gate");
  }

  const stepLabels = ["About You", "Your Money", "Protection", "Tax & Goals"];

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">

        {/* Page header */}
        {phase !== "result" && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Health Score</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Get a comprehensive 0–100 score across 6 dimensions in under a minute.
            </p>
          </div>
        )}

        {phase === "result" && result && <HealthScoreResults response={result} onReset={reset} />}

        {phase === "loading" && (
          <div className="bg-card border border-border rounded-xl px-8">
            <AnalysisLoader
              stages={[
                "Validating your financial data...",
                "Running finance engine...",
                "Generating AI recommendations...",
              ]}
              stageDelays={[1500, 3500]}
              footerNote="This usually takes 5–8 seconds"
              paddingY="py-20"
            />
          </div>
        )}

        {(phase === "gate" || phase === "wizard" || phase === "review") && (
          <div className="bg-card border border-border rounded-xl p-6">
            {phase === "gate" && (
              <ScenarioStartGate
                toolName="Health Score"
                prefilledFields="Age, income, assets, debts, insurance and tax deductions"
                onChoice={handleGateChoice}
              />
            )}

            {phase === "wizard" && (
              <>
                <StepperHeader
                  current={step}
                  onStepClick={(n) => { setStep(n); setError(""); }}
                />

              <div className="mb-6">
                <h2 className="text-base font-semibold">
                  Step {step}: {stepLabels[step - 1]}
                  {step === 4 && <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Optional</span>}
                </h2>
              </div>

                {step === 1 && <StepBasics form={form} onChange={patch} />}
                {step === 2 && <StepMoney form={form} onChange={patch} />}
                {step === 3 && <StepProtection form={form} onChange={patch} />}
                {step === 4 && <StepTaxGoals form={form} onChange={patch} />}
              </>
            )}

            {phase === "review" && (
              <div className="space-y-5">
                <ReviewCard form={form} onEdit={(s) => { setStep(s); setPhase("wizard"); }} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}

            {phase !== "gate" && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={goBack} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>

                <div className="flex items-center gap-3">
                  {phase === "wizard" && step === 4 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setError(""); setPhase("review"); }}
                      className="text-muted-foreground"
                    >
                      Skip this step
                    </Button>
                  )}

                  {phase === "wizard" && (
                    <Button type="button" onClick={goNext} className="gap-1.5">
                      {step === 4 ? "Review" : "Next"} <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}

                  {phase === "review" && (
                    <Button type="button" onClick={handleSubmit} size="lg" className="px-8 gap-1.5">
                      Calculate My Score <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
