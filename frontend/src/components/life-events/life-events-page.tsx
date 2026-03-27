// frontend/src/components/life-events/life-events-page.tsx
"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  Loader2, TrendingUp, Calculator,
} from "lucide-react";
import { AppShell }    from "@/components/layout/app-shell";
import { Button }      from "@/components/ui/button";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { cn }          from "@/lib/utils";
import { getLifeEventPlan } from "@/lib/finance";
import {
  DEFAULT_LIFE_EVENT_FORM,
  EVENT_META,
  buildLifeEventPayload,
  type LifeEventFormState,
  type LifeEventApiResponse,
} from "@/lib/life-event-types";
import { StepEventPicker }       from "./steps/step-event-picker";
import { StepProfile }           from "./steps/step-profile";
import { StepEventDetails }      from "./steps/step-event-details";
import { EventHero }             from "./results/event-hero";
import { AllocationWaterfall }   from "./results/allocation-waterfall";
import { InsuranceGaps }         from "./results/insurance-gaps";
import { PriorityTimeline }      from "./results/priority-timeline";

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Life Event",  desc: "What happened?" },
  { id: 2, label: "Your Profile", desc: "Financial snapshot" },
  { id: 3, label: "Details",     desc: "Final specifics" },
];

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(step: number, form: LifeEventFormState): string | null {
  if (step === 1) {
    if (!form.event_type) return "Please select a life event to continue.";
  }
  if (step === 2) {
    const age = Number(form.age);
    if (!form.age || age < 18 || age > 80) return "Please enter a valid age (18–80).";
    if (!form.city || form.city.trim().length < 2) return "Please enter your city.";
    if (!form.monthly_gross_income || Number(form.monthly_gross_income) <= 0)
      return "Please enter your monthly income.";
    if (!form.monthly_expenses || Number(form.monthly_expenses) <= 0)
      return "Please enter your monthly expenses.";
    if (Number(form.monthly_expenses) >= Number(form.monthly_gross_income))
      return "Monthly expenses cannot exceed income.";
  }
  if (step === 3) {
    const meta = EVENT_META[form.event_type!];
    if (meta.needsAmount && (!form.event_amount || Number(form.event_amount) <= 0))
      return "Please enter the amount received.";
    if (meta.needsPropertyValue && (!form.property_value || Number(form.property_value) <= 0))
      return "Please enter the property value.";
  }
  return null;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function StepperHeader({
  current, form, onStepClick,
}: {
  current: number;
  form: LifeEventFormState;
  onStepClick: (n: number) => void;
}) {
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
                {/* Show selected event on step 1 dot */}
                {step.id === 1 && isCompleted && form.event_type && (
                  <p className="text-[10px] text-primary">
                    {EVENT_META[form.event_type].emoji} {EVENT_META[form.event_type].label}
                  </p>
                )}
                {step.id !== 1 && (
                  <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                )}
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

// ─── Loading overlay ──────────────────────────────────────────────────────────
const LOADING_STAGES = [
  "Validating your financial profile...",
  "Analysing your life event...",
  "Computing allocations & gaps...",
  "Generating personalised AI advice...",
];

function LoadingOverlay({ eventType }: { eventType: string | null }) {
  const [stageIdx, setStageIdx] = useState(0);
  const meta = eventType ? EVENT_META[eventType as keyof typeof EVENT_META] : null;

  useState(() => {
    const timers = LOADING_STAGES.map((_, i) =>
      i > 0 ? setTimeout(() => setStageIdx(i), i * 1100) : null
    ).filter(Boolean);
    return () => timers.forEach((t) => t && clearTimeout(t));
  });

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-primary/20 animate-ping absolute" />
        <div className="h-16 w-16 rounded-full border-2 border-primary/40 flex items-center justify-center relative">
          {meta ? (
            <span className="text-2xl">{meta.emoji}</span>
          ) : (
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          )}
        </div>
      </div>
      <div className="space-y-2 text-center">
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export function LifeEventsPage() {
  const [step,    setStep   ] = useState(1);
  const [form,    setForm   ] = useState<LifeEventFormState>(DEFAULT_LIFE_EVENT_FORM);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState("");
  const [result,  setResult ] = useState<LifeEventApiResponse | null>(null);

  function patch(p: Partial<LifeEventFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  // Auto-advance from step 1 when event is picked
  function handleEventPick(p: Partial<LifeEventFormState>) {
    patch(p);
    if (p.event_type) {
      setTimeout(() => { setStep(2); setError(""); }, 300);
    }
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
    setError("");
    setLoading(true);
    try {
      const payload = buildLifeEventPayload(form);
      const res     = await getLifeEventPlan(payload as Record<string, unknown>);
      setResult(res as unknown as LifeEventApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setForm(DEFAULT_LIFE_EVENT_FORM);
    setStep(1);
    setError("");
  }

  const meta = form.event_type ? EVENT_META[form.event_type] : null;

  const stepTitles = [
    "What's Happening?",
    "Your Financial Snapshot",
    meta?.needsAmount     ? "Event Amount"      :
    meta?.needsPropertyValue ? "Property Details" :
    "Ready to Generate",
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">

        {/* ── Results ── */}
        {result && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your Life Event Plan</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {meta?.label} · Personalised financial action plan
              </p>
            </div>

            {/* Block 1: Hero */}
            <EventHero result={result.result} />

            {/* Block 2: Allocation waterfall (windfall only) */}
            <AllocationWaterfall result={result.result} />

            {/* Block 3: Insurance gaps */}
            <InsuranceGaps gaps={result.result.insurance_gaps} />

            {/* Block 4: Priority timeline */}
            <PriorityTimeline
              actions={result.result.priority_actions}
              eventType={result.result.event_type}
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
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calculator className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Optimise your tax</p>
                    <p className="text-[10px] text-muted-foreground">Bonus attracts additional tax</p>
                  </div>
                </div>
                <a href="/tax-wizard">
                  <Button variant="outline" size="sm" className="gap-1 text-xs flex-shrink-0">
                    Tax Wizard
                  </Button>
                </a>
              </div>
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">FIRE planning</p>
                    <p className="text-[10px] text-muted-foreground">Plan your financial independence</p>
                  </div>
                </div>
                <a href="/fire">
                  <Button variant="outline" size="sm" className="gap-1 text-xs flex-shrink-0">
                    FIRE Planner
                  </Button>
                </a>
              </div>
            </div>

            <Button variant="outline" onClick={reset} className="w-full" size="lg">
              Plan another life event
            </Button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && !result && (
          <div className="bg-card border border-border rounded-xl px-8">
            <LoadingOverlay eventType={form.event_type} />
          </div>
        )}

        {/* ── Wizard ── */}
        {!result && !loading && (
          <>
            {/* Page header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Life Events</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Get a tailored financial action plan for life&apos;s big moments.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <StepperHeader
                current={step}
                form={form}
                onStepClick={(n) => { setStep(n); setError(""); }}
              />

              <div className="mb-5">
                <h2 className="text-base font-semibold">
                  Step {step}: {stepTitles[step - 1]}
                </h2>
              </div>

              {/* Step content */}
              {step === 1 && (
                <StepEventPicker form={form} onChange={handleEventPick} />
              )}
              {step === 2 && (
                <StepProfile form={form} onChange={patch} />
              )}
              {step === 3 && (
                <StepEventDetails form={form} onChange={patch} />
              )}

              {/* Error */}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                )}

                {/* Step 1: Next only shows if event selected */}
                {step === 1 && (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={!form.event_type}
                    className="gap-1.5"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}

                {step === 2 && (
                  <Button type="button" onClick={goNext} className="gap-1.5">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}

                {step === 3 && (
                  <Button
                    type="button"
                    onClick={goNext}
                    size="lg"
                    className={cn(
                      "gap-1.5",
                      meta?.isCrisis && "bg-red-600 hover:bg-red-700 text-white border-red-600"
                    )}
                  >
                    {meta?.isCrisis ? "⚡ Generate Crisis Plan" : `${meta?.emoji ?? ""} Generate My Plan`}
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