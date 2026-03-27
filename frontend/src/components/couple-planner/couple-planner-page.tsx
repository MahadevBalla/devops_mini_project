// frontend/src/components/couple-planner/couple-planner-page.tsx
"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  Loader2, Heart,
} from "lucide-react";
import { AppShell }    from "@/components/layout/app-shell";
import { Button }      from "@/components/ui/button";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { cn }          from "@/lib/utils";
import { getCouplePlan } from "@/lib/finance";
import {
  DEFAULT_COUPLE_FORM,
  buildCouplePayload,
  type CoupleFormState,
  type CoupleApiResponse,
} from "@/lib/couple-types";

import { StepAbout }    from "./steps/step-about";
import { StepPartners } from "./steps/step-partners";
import { StepGoals }    from "./steps/step-goals";
import { CoupleHero }   from "./results/couple-hero";
import { SipSplit }     from "./results/sip-split";
import { HraBlock }     from "./results/hra-block";
import { TaxPanel }     from "./results/tax-panel";
import { InsurancePlan} from "./results/insurance-plan";
import { JointRoadmap } from "./results/joint-roadmap";

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "About You",    icon: "💑" },
  { id: 2, label: "Your Profiles", icon: "👥" },
  { id: 3, label: "Joint Goals",  icon: "🎯" },
];

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(step: number, form: CoupleFormState): string | null {
  if (step === 2) {
    const partners = [
      { p: form.partner_a, name: form.name_a || "Partner A" },
      { p: form.partner_b, name: form.name_b || "Partner B" },
    ];
    for (const { p, name } of partners) {
      const age = Number(p.age);
      if (!p.age || age < 18 || age > 70)
        return `${name}: enter a valid age (18–70).`;
      if (!p.city || p.city.trim().length < 2)
        return `${name}: enter a city.`;
      if (!p.monthly_gross_income || Number(p.monthly_gross_income) <= 0)
        return `${name}: enter a monthly income.`;
      if (!p.monthly_expenses || Number(p.monthly_expenses) <= 0)
        return `${name}: enter monthly expenses.`;
      if (Number(p.monthly_expenses) >= Number(p.monthly_gross_income))
        return `${name}: expenses cannot exceed income.`;
      const retAge = Number(p.retirement_age) || 60;
      if (retAge <= age)
        return `${name}: retirement age must be greater than current age.`;
    }
  }
  return null;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function StepperHeader({
  current, onStepClick,
}: { current: number; onStepClick: (n: number) => void }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = current > step.id;
        const isActive    = current === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(step.id)}
              className={cn("flex flex-col items-center gap-1",
                isCompleted ? "cursor-pointer" : "cursor-default")}
            >
              <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all text-sm",
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isActive
                  ? "border-primary text-primary bg-background"
                  : "border-border text-muted-foreground bg-background"
              )}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
              </div>
              <p className={cn(
                "text-[11px] font-medium hidden sm:block",
                isActive ? "text-primary" :
                isCompleted ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </p>
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

// ─── Loading overlay ──────────────────────────────────────────────────────────
const LOADING_STAGES = [
  "Validating both financial profiles...",
  "Optimising HRA routing...",
  "Computing SIP split & tax savings...",
  "Generating personalised joint advice...",
];

function LoadingOverlay({ nameA, nameB }: { nameA: string; nameB: string }) {
  const [stageIdx, setStageIdx] = useState(0);

  useState(() => {
    const timers = LOADING_STAGES.map((_, i) =>
      i > 0 ? setTimeout(() => setStageIdx(i), i * 1000) : null
    ).filter(Boolean);
    return () => timers.forEach((t) => t && clearTimeout(t));
  });

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-primary/20 animate-ping absolute" />
        <div className="h-16 w-16 rounded-full border-2 border-primary/40 flex items-center justify-center relative">
          <Heart className="h-7 w-7 text-primary" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Optimising {nameA || "Partner A"} &amp; {nameB || "Partner B"}&apos;s finances
        </p>
        <p className="text-xs text-muted-foreground">HRA · NPS · SIP · Tax · Insurance</p>
      </div>
      <div className="space-y-2 text-left">
        {LOADING_STAGES.map((label, i) => (
          <div key={i} className={cn("flex items-center gap-2 text-sm", i > stageIdx && "opacity-30")}>
            {i < stageIdx
              ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              : i === stageIdx
              ? <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
              : <div className="h-4 w-4 rounded-full border border-border flex-shrink-0" />
            }
            <span className={cn(i === stageIdx ? "text-foreground font-medium" : "text-muted-foreground")}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CouplePlannerPage() {
  const [step,    setStep   ] = useState(1);
  const [form,    setForm   ] = useState<CoupleFormState>(DEFAULT_COUPLE_FORM);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState("");
  const [result,  setResult ] = useState<CoupleApiResponse | null>(null);

  function patch(p: Partial<CoupleFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function goNext() {
    const err = validate(step, form);
    if (err) { setError(err); return; }
    setError("");
    if (step < 3) { setStep((s) => s + 1); return; }
    handleSubmit();
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const payload = buildCouplePayload(form);
      const res = await getCouplePlan(payload);
      setResult(res as unknown as CoupleApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setForm(DEFAULT_COUPLE_FORM);
    setStep(1);
    setError("");
  }

  // Average years to retirement for SIP corpus projection
  const avgRetirementYears = Math.max(
    Math.round(
      ((Number(form.partner_a.retirement_age) || 60) - (Number(form.partner_a.age) || 30) +
       (Number(form.partner_b.retirement_age) || 60) - (Number(form.partner_b.age) || 30)) / 2
    ),
    1
  );

  const nameA = form.name_a || "Partner A";
  const nameB = form.name_b || "Partner B";

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl mx-auto">

        {/* ── Results ── */}
        {result && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {nameA} &amp; {nameB} — Joint Financial Plan
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Optimised for HRA · NPS · SIP split · Tax savings · Insurance
              </p>
            </div>

            <CoupleHero   result={result.result} nameA={nameA} nameB={nameB} />
            <SipSplit     result={result.result} nameA={nameA} nameB={nameB}
                          avgRetirementYears={avgRetirementYears} />
            <HraBlock     result={result.result} nameA={nameA} nameB={nameB} />
            <TaxPanel     result={result.result} nameA={nameA} nameB={nameB} />
            <InsurancePlan result={result.result} nameA={nameA} nameB={nameB} />
            <JointRoadmap  recommendations={result.result.recommendations}
                           nameA={nameA} nameB={nameB} />

            <div>
              <h2 className="text-base font-semibold mb-3">AI Recommendations</h2>
              <AdvicePanel advice={result.advice} />
            </div>

            <Button variant="outline" onClick={reset} className="w-full" size="lg">
              Recalculate
            </Button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && !result && (
          <div className="bg-card border border-border rounded-xl px-8">
            <LoadingOverlay nameA={nameA} nameB={nameB} />
          </div>
        )}

        {/* ── Wizard ── */}
        {!result && !loading && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Couple Planner</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Joint financial optimisation — HRA, NPS, SIP split, and tax coordination.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <StepperHeader
                current={step}
                onStepClick={(n) => { setStep(n); setError(""); }}
              />

              <div className="mb-5">
                <h2 className="text-base font-semibold">
                  Step {step}:{" "}
                  {step === 1 ? "About You Two" :
                   step === 2 ? "Your Financial Profiles" :
                   "Joint Goals (Optional)"}
                </h2>
              </div>

              {step === 1 && <StepAbout    form={form} onChange={patch} />}
              {step === 2 && <StepPartners form={form} onChange={patch} />}
              {step === 3 && <StepGoals    form={form} onChange={patch} />}

              {error && (
                <div className="mt-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Nav */}
              <div className={cn(
                "flex items-center mt-6 pt-4 border-t border-border",
                step === 1 ? "justify-end" : "justify-between"
              )}>
                {step > 1 && (
                  <Button variant="outline" onClick={goBack} className="gap-1.5">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                )}

                {step < 3 ? (
                  <Button onClick={goNext} className="gap-1.5">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={goNext} size="lg" className="gap-1.5">
                    💑 Optimise Our Finances
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}