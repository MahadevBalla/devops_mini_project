// frontend/src/components/couple-planner/couple-planner-page.tsx
"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  Heart, Users2, UserRound, Target, LucideIcon
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { ScenarioStartGate, type ScenarioChoice } from "@/components/ui/scenario-start-gate";
import { cn } from "@/lib/utils";
import { getCouplePlan } from "@/lib/finance";
import { getPortfolio, isProfileEmpty, portfolioToPartnerForm } from "@/lib/portfolio";
import {
  DEFAULT_COUPLE_FORM,
  buildCouplePayload,
  type CoupleFormState,
  type CoupleApiResponse,
} from "@/lib/couple-types";
import { storeToolSession } from "@/lib/chat";

import { StepAbout } from "./steps/step-about";
import { StepPartners } from "./steps/step-partners";
import { StepGoals } from "./steps/step-goals";
import { CoupleHero } from "./results/couple-hero";
import { SipSplit } from "./results/sip-split";
import { HraBlock } from "./results/hra-block";
import { TaxPanel } from "./results/tax-panel";
import { InsurancePlan } from "./results/insurance-plan";
import { JointRoadmap } from "./results/joint-roadmap";
import { AnalysisLoader } from "@/components/ui/analysis-loader";
import { Users, PiggyBank, TrendingUp } from "lucide-react";


// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS: { id: number; label: string; icon: LucideIcon }[] = [
  { id: 1, label: "About You", icon: Users2 },
  { id: 2, label: "Your Profiles", icon: UserRound },
  { id: 3, label: "Joint Goals", icon: Target },
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
}: Readonly<{ current: number; onStepClick: (n: number) => void }>) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = current > step.id;
        const isActive = current === step.id;
        const Icon = step.icon;
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
                {isCompleted
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <Icon className="h-4 w-4" />
                }
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

// ─── Main page ────────────────────────────────────────────────────────────────
export function CouplePlannerPage() {
  type Phase = "gate" | "wizard" | "review" | "loading" | "result";

  const [phase, setPhase] = useState<Phase>("gate");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CoupleFormState>(DEFAULT_COUPLE_FORM);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CoupleApiResponse | null>(null);
  const [isPortfolioRun, setIsPortfolioRun] = useState(false);

  async function handleGateChoice(choice: ScenarioChoice) {
    if (choice === "portfolio") {
      setIsPortfolioRun(true);
      try {
        const portfolio = await getPortfolio();
        if (!isProfileEmpty(portfolio)) {
          const mapped = portfolioToPartnerForm(
            portfolio.profile as Parameters<typeof portfolioToPartnerForm>[0]
          );
          setForm((f) => ({
            ...f,
            partner_a: { ...f.partner_a, ...mapped },
          }));
        }
      } catch { }
    }
    setPhase("wizard");
    setStep(1);
  }

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
    if (phase === "review") { setPhase("wizard"); return; }
    if (step === 1) { setPhase("gate"); return; }
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    setPhase("loading");
    setError("");
    try {
      const payload = buildCouplePayload(form);
      const res = await getCouplePlan(payload, isPortfolioRun);
      setResult(res as unknown as CoupleApiResponse);
      storeToolSession("couple", res.session_id, isPortfolioRun ? "portfolio" : "scenario");
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhase("wizard");
    }
  }

  function reset() {
    setResult(null);
    setForm(DEFAULT_COUPLE_FORM);
    setStep(1);
    setIsPortfolioRun(false);
    setError("");
    setPhase("gate");
  }

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
        {phase !== "result" && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Couple Planner</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Joint financial optimisation - HRA, NPS, SIP split, and tax coordination.
            </p>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {nameA} &amp; {nameB} — Joint Financial Plan
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Optimised for HRA · NPS · SIP split · Tax savings · Insurance
              </p>
            </div>

            <CoupleHero result={result.result} nameA={nameA} nameB={nameB} />
            <SipSplit result={result.result} nameA={nameA} nameB={nameB}
              avgRetirementYears={avgRetirementYears} />
            <HraBlock result={result.result} nameA={nameA} nameB={nameB} />
            <TaxPanel result={result.result} nameA={nameA} nameB={nameB} />
            <InsurancePlan result={result.result} nameA={nameA} nameB={nameB} />
            <JointRoadmap recommendations={result.result.recommendations}
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

        {phase === "loading" && (
          <div className="bg-card border border-border rounded-xl px-8">
            <AnalysisLoader
              stages={[
                "Validating both financial profiles...",
                "Optimising HRA routing...",
                "Computing SIP split & tax savings...",
                "Generating personalised joint advice...",
              ]}
              stageDelays={[1000, 2000, 3000]}
              title={`Optimising ${nameA} & ${nameB}'s finances`}
              subtitle="HRA · NPS · SIP · Tax · Insurance"
            />
          </div>
        )}

        {(phase === "gate" || phase === "wizard") && (
          <div className="bg-card border border-border rounded-xl p-6">
            {phase === "gate" && (
              <ScenarioStartGate
                heroProps={{
                  icon: Users,
                  badge: "For Couples",
                  title: "Couple Financial Planner",
                  subtitle: "Merge two income profiles, split goals intelligently, and build a joint FIRE plan that works for both of you.",
                  accentClass: "text-pink-500",
                  bgClass: "bg-pink-500/10",
                  features: [
                    { icon: Target, label: "Joint FIRE goal planning" },
                    { icon: PiggyBank, label: "Smart income split strategy" },
                    { icon: TrendingUp, label: "Combined corpus projection" },
                  ],
                }}
                toolName="Couple Planner"
                prefilledFields="Your profile pre-fills Partner A - Partner B stays blank"
                onChoice={handleGateChoice}
              />
            )}

            {phase === "wizard" && (
              <>
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

                {step === 1 && <StepAbout form={form} onChange={patch} />}
                {step === 2 && <StepPartners form={form} onChange={patch} />}
                {step === 3 && <StepGoals form={form} onChange={patch} />}

                {error && (
                  <div className="mt-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
                    {error}
                  </div>
                )}

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
                      <Heart className="h-4 w-4" /> Optimise Our Finances
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
