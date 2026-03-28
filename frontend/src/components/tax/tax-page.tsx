"use client";
import { useState } from "react";
import {
  ChevronRight, ChevronLeft, CheckCircle2,
  ArrowRight, Flame, TrendingUp, Loader2, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { ScenarioStartGate, type ScenarioChoice } from "@/components/ui/scenario-start-gate";
import { AnalysisLoader } from "@/components/ui/analysis-loader";
import { cn } from "@/lib/utils";
import { getTaxAnalysis } from "@/lib/finance";
import { getPortfolio, isProfileEmpty, portfolioToTaxForm } from "@/lib/portfolio";
import {
  DEFAULT_TAX_FORM,
  FY_LABEL,
  type TaxFormState,
  type TaxApiResponse,
  type TaxPayload,
} from "@/lib/tax-types";
import { StepIncome } from "./steps/step-income";
import { StepDeductions } from "./steps/step-deductions";
import { RegimeCompare } from "./results/regime-compare";
import { TaxVerdict } from "./results/tax-verdict";
import { MissedDeductions } from "./results/missed-deductions";
import { SlabBreakdown } from "./results/slab-breakdown";
import { storeToolSession } from "@/lib/chat";

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Income", desc: "Your earnings" },
  { id: 2, label: "Deductions", desc: "Tax-saving items" },
];

const LOADING_STAGES = [
  "Validating your income profile...",
  "Computing Old vs New regime tax...",
  "Detecting unused deductions...",
  "Generating AI tax advice...",
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
    age: Number(form.age),
    city: form.city.trim(),
    employment_type: form.employment_type,
    dependents: 0,
    monthly_gross_income: Math.round(annualGross / 12),
    monthly_expenses: 0,
    emergency_fund: 0,
    risk_profile: "moderate",
    retirement_age: Math.max(Number(form.age) + 1, 60),
    assets: { equity: 0, debt: 0, gold: 0, real_estate: 0, cash: 0, ppf_epf: 0, other: 0 },
    debts: [],
    insurance: { has_term_life: false, term_cover: 0, has_health: false, health_cover: 0, has_critical_illness: false },
    tax_deductions: {
      section_80c: Math.min(num(form.section_80c), 1_50_000),
      section_80d_self: Math.min(num(form.section_80d_self), form.section_80d_self_is_senior ? 50_000 : 25_000),
      section_80d_self_is_senior: form.section_80d_self_is_senior || Number(form.age) >= 60,
      section_80d_parents: Math.min(num(form.section_80d_parents), form.section_80d_parents_are_senior ? 50_000 : 25_000),
      section_80d_parents_are_senior: form.section_80d_parents_are_senior,
      nps_80ccd_1b: Math.min(num(form.nps_80ccd_1b), 50_000),
      hra_claimed: form.employment_type === "salaried" ? num(form.hra_claimed) : 0,
      home_loan_interest: Math.min(num(form.home_loan_interest), 2_00_000),
      other_deductions: num(form.other_deductions),
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
        const isActive = current === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(step.id)}
              className={cn(
                "flex flex-col items-center",
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

// ─── Stateful Calculate Button ─────────────────────────────────────────────────
type BtnState = "idle" | "calculating" | "saved";

function CalculateButton({
  state,
  savedAmount,
  onClick,
}: {
  state: BtnState;
  savedAmount: number;
  onClick: () => void;
}) {
  const fmt = (n: number) =>
    n >= 1e5
      ? `₹${(n / 1e5).toFixed(1)}L`
      : `₹${n.toLocaleString("en-IN")}`;

  const content: Record<BtnState, React.ReactNode> = {
    idle: (
      <motion.span
        key="idle"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-1.5"
      >
        Compare Tax Regimes
      </motion.span>
    ),
    calculating: (
      <motion.span
        key="calculating"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-2"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Calculating…
      </motion.span>
    ),
    saved: (
      <motion.span
        key="saved"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="flex items-center gap-1.5"
        style={{ color: "var(--success)" }}
      >
        <Check className="h-4 w-4" />
        Saved {fmt(savedAmount)} ✓
      </motion.span>
    ),
  };

  return (
    <Button
      type="button"
      size="lg"
      onClick={onClick}
      disabled={state === "calculating"}
      className="gap-1.5 min-w-50"
      style={
        state === "saved"
          ? {
            background: "var(--success-subtle)",
            borderColor: "oklch(0.60 0.21 145 / 0.30)",
            color: "var(--success)",
          }
          : {}
      }
    >
      <AnimatePresence mode="wait">
        {content[state]}
      </AnimatePresence>
    </Button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function TaxPage() {
  type Phase = "gate" | "wizard" | "loading" | "result";
  const [phase, setPhase] = useState<Phase>("gate");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TaxFormState>(DEFAULT_TAX_FORM);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TaxApiResponse | null>(null);
  const [btnState, setBtnState] = useState<BtnState>("idle");

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
      } catch { }
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
    if (step === 1) { setPhase("gate"); return; }
    setStep((s) => s - 1);
  }

  async function handleSubmit(skipDeductions = false) {
    setError("");
    // Button state: calculating
    setBtnState("calculating");
    setPhase("loading");
    try {
      const payload = buildPayload(
        skipDeductions
          ? {
            ...form,
            section_80c: "", section_80d_self: "", section_80d_parents: "",
            nps_80ccd_1b: "", hra_claimed: "", home_loan_interest: "", other_deductions: "",
          }
          : form
      );
      const res = await getTaxAnalysis(payload);
      setResult(res);
      storeToolSession("tax", res.session_id);
      // Button state: saved (with savings amount)
      setBtnState("saved");
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBtnState("idle");
      setPhase("wizard");
    }
  }

  function reset() {
    setResult(null);
    setForm(DEFAULT_TAX_FORM);
    setStep(1);
    setError("");
    setBtnState("idle");
    setPhase("gate");
  }

  const stepTitles = ["Income & Profile", "Tax Deductions"];

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">

        {/* ── Page header ── */}
        {phase !== "result" && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tax Wizard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Old vs New regime comparison with missing deduction detection · {FY_LABEL}
            </p>
          </div>
        )}

        {/* ══════════════════ RESULT PHASE ══════════════════ */}
        {phase === "result" && result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your Tax Analysis</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {FY_LABEL} · Based on income ₹{(result.result.gross_income / 1e5).toFixed(1)}L
              </p>
            </div>

            {/* Block 1: Regime Compare — the new hero */}
            <RegimeCompare
              result={result.result}
            />

            {/* Block 2: Verdict (summary hero, kept for full context) */}
            <TaxVerdict result={result.result} />

            {/* Block 3: Missed deductions — expanded cards */}
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
              {[
                {
                  icon: Flame,
                  title: "Plan your FIRE path",
                  sub: "Lower tax = higher investable surplus",
                  href: "/fire",
                  cta: "FIRE",
                },
                {
                  icon: TrendingUp,
                  title: "Check financial health",
                  sub: "Full 6-dimension diagnosis",
                  href: "/health-score",
                  cta: "Health",
                },
              ].map(({ icon: Icon, title, sub, href, cta }) => (
                <div
                  key={href}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "var(--muted)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--primary-subtle)" }}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{title}</p>
                      <p className="text-[10px] text-muted-foreground">{sub}</p>
                    </div>
                  </div>
                  <a href={href}>
                    <Button variant="outline" size="sm" className="gap-1 shrink-0 text-xs">
                      {cta} <ArrowRight className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={reset} className="w-full" size="lg">
              Recalculate with new data
            </Button>
          </motion.div>
        )}

        {/* ══════════════════ LOADING PHASE ══════════════════ */}
        {phase === "loading" && (
          <div
            className="rounded-xl border px-8"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <AnalysisLoader
              stages={LOADING_STAGES}
              stageDelays={[1200, 2400, 3600]}
              footerNote="Usually takes 5 seconds"
              paddingY="py-20"
            />
          </div>
        )}

        {/* ══════════════════ GATE + WIZARD PHASE ══════════════════ */}
        {(phase === "gate" || phase === "wizard") && (
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
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
                {step === 1 && <StepIncome form={form} onChange={patch} />}
                {step === 2 && <StepDeductions form={form} onChange={patch} />}
              </>
            )}

            {error && (
              <div
                className="mt-4 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "oklch(0.577 0.245 27.325 / 0.08)",
                  border: "1px solid oklch(0.577 0.245 27.325 / 0.25)",
                  color: "var(--destructive)",
                }}
              >
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
                      Skip &amp; Compare
                    </Button>
                  )}

                  {step < 2 ? (
                    <Button
                      type="button"
                      onClick={goNext}
                      className="gap-1.5"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <CalculateButton
                      state={btnState}
                      savedAmount={result?.result.savings_by_switching ?? 0}
                      onClick={goNext}
                    />
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
