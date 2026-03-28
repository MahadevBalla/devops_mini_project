// frontend/src/components/tax/tax-page.tsx
"use client";

import { useState } from "react";
import {
  ChevronRight, ChevronLeft, CheckCircle2,
  ArrowRight, Flame, TrendingUp,
} from "lucide-react";
import { AppShell }    from "@/components/layout/app-shell";
import { Button }      from "@/components/ui/button";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { ScenarioStartGate, type ScenarioChoice } from "@/components/ui/scenario-start-gate";
import { cn }          from "@/lib/utils";
import { getTaxAnalysis } from "@/lib/finance";
import { getPortfolio, isProfileEmpty, portfolioToTaxForm } from "@/lib/portfolio";
import {
  DEFAULT_TAX_FORM,
  FY_LABEL,
  type TaxFormState,
  type TaxApiResponse,
  type TaxPayload,
} from "@/lib/tax-types";
import { StepIncome }       from "./steps/step-income";
import { StepDeductions }   from "./steps/step-deductions";
import { TaxVerdict }       from "./results/tax-verdict";
import { TaxBar }           from "./results/tax-bar";
import { MissedDeductions } from "./results/missed-deductions";
import { SlabBreakdown }    from "./results/slab-breakdown";
import { AnalysisLoader } from "@/components/ui/analysis-loader";

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Income",     desc: "Your earnings"    },
  { id: 2, label: "Deductions", desc: "Tax-saving items" },
];

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(step: number, form: TaxFormState): string | null {
  if (step === 1) {
    const age = Number(form.age);
    if (!form.age || age < 18 || age > 80)
      return "Please enter a valid age between 18 and 80.";
    if (!form.city || form.city.trim().length < 2)
      return "Please enter your city.";
    const income = Number(form.annual_gross_income);
    if (!form.annual_gross_income || income <= 0)
      return "Please enter your annual gross income.";
    if (income < 1_00_000)
      return "Annual income seems too low. Did you enter monthly instead of annual?";
  }
  return null;
}

// ─── Payload builder ──────────────────────────────────────────────────────────
function buildPayload(form: TaxFormState): TaxPayload {
  const annualGross = Number(form.annual_gross_income);
  const num = (v: string) => Number(v) || 0;

  return {
    age:                  Number(form.age),
    city:                 form.city.trim(),
    employment_type:      form.employment_type,
    dependents:           0,
    monthly_gross_income: Math.round(annualGross / 12),
    monthly_expenses:     0,
    emergency_fund:       0,
    risk_profile:         "moderate",
    retirement_age:       Math.max(Number(form.age) + 1, 60),
    assets: { equity: 0, debt: 0, gold: 0, real_estate: 0, cash: 0, ppf_epf: 0, other: 0 },
    debts: [],
    insurance: { has_term_life: false, term_cover: 0, has_health: false, health_cover: 0, has_critical_illness: false },
    tax_deductions: {
      section_80c:                  Math.min(num(form.section_80c),          1_50_000),
      section_80d_self:             Math.min(num(form.section_80d_self),     form.section_80d_self_is_senior ? 50_000 : 25_000),
      section_80d_self_is_senior:   form.section_80d_self_is_senior || Number(form.age) >= 60,
      section_80d_parents:          Math.min(num(form.section_80d_parents),  form.section_80d_parents_are_senior ? 50_000 : 25_000),
      section_80d_parents_are_senior: form.section_80d_parents_are_senior,
      nps_80ccd_1b:                 Math.min(num(form.nps_80ccd_1b),         50_000),
      hra_claimed:                  form.employment_type === "salaried" ? num(form.hra_claimed) : 0,
      home_loan_interest:           Math.min(num(form.home_loan_interest),   2_00_000),
      other_deductions:             num(form.other_deductions),
    },
    goals: [],
  };
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
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
        const isActive    = current === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(step.id)}
              className={cn("flex flex-col items-center", isCompleted ? "cursor-pointer" : "cursor-default")}
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
                <p className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export function TaxPage() {
  type Phase = "gate" | "wizard" | "review" | "loading" | "result";

  const [phase, setPhase] = useState<Phase>("gate");
  const [step,    setStep   ] = useState(1);
  const [form,    setForm   ] = useState<TaxFormState>(DEFAULT_TAX_FORM);
  const [error,   setError  ] = useState("");
  const [result,  setResult ] = useState<TaxApiResponse | null>(null);

  async function handleGateChoice(choice: ScenarioChoice) {
    if (choice === "portfolio") {
      try {
        const portfolio = await getPortfolio();
        if (!isProfileEmpty(portfolio)) {
          const mapped = portfolioToTaxForm(
            portfolio.profile as Parameters<typeof portfolioToTaxForm>[0]
          );
          setForm((f) => ({ ...f, ...mapped }));
        }
      } catch {}
    }
    setPhase("wizard");
    setStep(1);
  }

  function patch(p: Partial<TaxFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function goNext() {
    const err = validate(step, form);
    if (err) { setError(err); return; }
    setError("");
    if (step < 2) { setStep(2); return; }
    handleSubmit();
  }

  function goBack() {
    setError("");
    if (phase === "review") { setPhase("wizard"); return; }
    if (step === 1) { setPhase("gate"); return; }
    setStep((s) => s - 1);
  }

  async function handleSubmit(skipDeductions = false) {
    setError("");
    setPhase("loading");
    try {
      const payload = buildPayload(
        skipDeductions
          ? { ...form,
              section_80c: "", section_80d_self: "", section_80d_parents: "",
              nps_80ccd_1b: "", hra_claimed: "", home_loan_interest: "", other_deductions: "",
            }
          : form
      );
      const res = await getTaxAnalysis(payload);
      setResult(res);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhase("wizard");
    }
  }

  function reset() {
    setResult(null);
    setForm(DEFAULT_TAX_FORM);
    setStep(1);
    setError("");
    setPhase("gate");
  }

  const stepTitles = ["Income & Profile", "Tax Deductions"];

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Page header */}
        {phase !== "result" && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tax Wizard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Old vs New regime comparison with missing deduction detection · {FY_LABEL}
            </p>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your Tax Analysis</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {FY_LABEL} · Based on income ₹{(result.result.gross_income / 1e5).toFixed(1)}L
              </p>
            </div>

            {/* Block 1: Verdict hero */}
            <TaxVerdict result={result.result} />

            {/* Block 2: Visual bar */}
            <TaxBar result={result.result} />

            {/* Block 3: Missed deductions */}
            <MissedDeductions result={result.result} />

            {/* Block 4: Slab breakdown */}
            <SlabBreakdown
              result={result.result}
              deductions={result.profile.tax_deductions}
            />

            {/* Block 5: AI Advice */}
            <div>
              <h2 className="text-base font-semibold mb-3">AI Recommendations</h2>
              <AdvicePanel advice={result.advice} />
            </div>

            {/* Cross-feature CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Flame className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Plan your FIRE path</p>
                    <p className="text-[10px] text-muted-foreground">
                      Lower tax = higher investable surplus
                    </p>
                  </div>
                </div>
                <a href="/fire">
                  <Button variant="outline" size="sm" className="gap-1 shrink-0 text-xs">
                    FIRE <ArrowRight className="h-3 w-3" />
                  </Button>
                </a>
              </div>
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Check financial health</p>
                    <p className="text-[10px] text-muted-foreground">
                      Full 6-dimension diagnosis
                    </p>
                  </div>
                </div>
                <a href="/health-score">
                  <Button variant="outline" size="sm" className="gap-1 shrink-0 text-xs">
                    Health <ArrowRight className="h-3 w-3" />
                  </Button>
                </a>
              </div>
            </div>

            <Button variant="outline" onClick={reset} className="w-full" size="lg">
              Recalculate with new data
            </Button>
          </div>
        )}

        {phase === "loading" && (
          <div className="bg-card border border-border rounded-xl px-8">
            <AnalysisLoader
              stages={[
                "Validating your income profile...",
                "Computing Old vs New regime tax...",
                "Detecting unused deductions...",
                "Generating AI tax advice...",
              ]}
              stageDelays={[1200, 2400, 3600]}
              paddingY="py-20"
            />
          </div>
        )}

        {(phase === "gate" || phase === "wizard") && (
          <div className="bg-card border border-border rounded-xl p-6">
            {phase === "gate" && (
              <ScenarioStartGate
                toolName="Tax Wizard"
                prefilledFields="Age, income, employment type and all 80C/80D deductions"
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
                    Step {step}: {stepTitles[step - 1]}
                    {step === 2 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    )}
                  </h2>
                </div>

                {step === 1 && <StepIncome     form={form} onChange={patch} />}
                {step === 2 && <StepDeductions form={form} onChange={patch} />}
              </>
            )}

            {error && (
              <div className="mt-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}

            {phase !== "gate" && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>

                <div className="flex items-center gap-3">
                  {step === 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setError(""); handleSubmit(true); }}
                      className="text-muted-foreground"
                    >
                      Skip & Compare
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={goNext}
                    size={step === 2 ? "lg" : "default"}
                    className="gap-1.5"
                  >
                    {step === 2
                      ? "Compare Tax Regimes"
                      : <><span>Next</span> <ChevronRight className="h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}