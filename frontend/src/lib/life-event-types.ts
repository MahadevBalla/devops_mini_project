// frontend/src/lib/life-event-types.ts
// Mirrors backend models/common.py LifeEventType + models/life_event.py
// Keep in sync with backend/models/common.py

import type { EmploymentType } from "@/lib/health-score-types";
export type { EmploymentType };

// ─── Event type enum (mirrors LifeEventType in common.py) ────────────────────
export type LifeEventType =
  | "bonus"
  | "inheritance"
  | "marriage"
  | "new_baby"
  | "job_loss"
  | "home_purchase";

// ─── API payload ──────────────────────────────────────────────────────────────
// Backend router reads raw_data dict and extracts event_type, event_amount,
// event_details from top-level keys. Profile fields go at root level too.
export interface LifeEventPayload {
  // UserProfile fields (required by intake agent)
  age: number;
  city: string;
  employment_type: EmploymentType;
  dependents: number;
  monthly_gross_income: number;
  monthly_expenses: number;
  emergency_fund: number;
  risk_profile: "conservative" | "moderate" | "aggressive";
  retirement_age: number;
  assets: {
    equity: number; debt: number; gold: number;
    real_estate: number; cash: number; ppf_epf: number; other: number;
  };
  debts: DebtItem[];
  insurance: InsuranceCoverage;
  tax_deductions: {
    section_80c: number;
    section_80d_self: number;
    section_80d_self_is_senior: boolean;
    section_80d_parents: number;
    section_80d_parents_are_senior: boolean;
    nps_80ccd_1b: number;
    hra_claimed: number;
    home_loan_interest: number;
    other_deductions: number;
  };
  goals: [];

  // Life event specific — extracted by router before passing to intake agent
  event_type: LifeEventType;
  event_amount: number;
  event_details: Record<string, number>; // e.g. { property_value: 8000000 }
}

export interface DebtItem {
  name: string;
  outstanding: number;
  emi: number;
  interest_rate: number;
  is_secured: boolean;
}

export interface InsuranceCoverage {
  has_term_life: boolean;
  term_cover: number;
  has_health: boolean;
  health_cover: number;
  has_critical_illness: boolean;
}

// ─── API response ─────────────────────────────────────────────────────────────
export interface LifeEventAllocation {
  category: string;
  amount: number;
  rationale: string;
}

export interface LifeEventResult {
  event_type: LifeEventType;
  event_amount: number;
  tax_impact: number;
  allocations: LifeEventAllocation[];
  insurance_gaps: string[];
  priority_actions: string[];
}

export interface LifeEventApiResponse {
  session_id: string;
  result: LifeEventResult;
  advice: {
    summary: string;
    key_actions: string[];
    risks: string[];
    disclaimer: string;
  };
  decision_log: unknown[];
}

// ─── Wizard form state ────────────────────────────────────────────────────────
export interface LifeEventFormState {
  // Step 1
  event_type: LifeEventType | null;

  // Step 2 — profile
  age: string;
  city: string;
  employment_type: EmploymentType;
  monthly_gross_income: string;
  monthly_expenses: string;
  emergency_fund: string;
  has_term_life: boolean;
  term_cover: string;
  has_health: boolean;
  health_cover: string;
  debts: DebtItem[];

  // Step 3 — event details
  event_amount: string;          // bonus / inheritance
  property_value: string;        // home_purchase → event_details.property_value
}

export const DEFAULT_LIFE_EVENT_FORM: LifeEventFormState = {
  event_type: null,
  age: "",
  city: "",
  employment_type: "salaried",
  monthly_gross_income: "",
  monthly_expenses: "",
  emergency_fund: "",
  has_term_life: false,
  term_cover: "",
  has_health: false,
  health_cover: "",
  debts: [],
  event_amount: "",
  property_value: "",
};

// ─── Event metadata (UI config per event type) ────────────────────────────────
export interface EventMeta {
  type: LifeEventType;
  emoji: string;
  label: string;
  tagline: string;
  description: string;
  // Visual theming
  colorClass: string;          // Tailwind border + bg classes for selected state
  heroBg: string;              // results hero background gradient
  heroText: string;            // results hero text color
  heroBorder: string;
  // Behaviour
  needsAmount: boolean;        // bonus, inheritance
  needsPropertyValue: boolean; // home_purchase
  isCrisis: boolean;           // job_loss
  category: "windfall" | "milestone";
}

export const EVENT_META: Record<LifeEventType, EventMeta> = {
  bonus: {
    type: "bonus",
    emoji: "🎁",
    label: "Got a Bonus",
    tagline: "Make it work harder",
    description: "Annual bonus, performance pay, or any windfall income",
    colorClass: "border-amber-400 bg-amber-50 dark:bg-amber-950/20",
    heroBg: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20",
    heroText: "text-amber-900 dark:text-amber-100",
    heroBorder: "border-amber-300 dark:border-amber-700",
    needsAmount: true,
    needsPropertyValue: false,
    isCrisis: false,
    category: "windfall",
  },
  inheritance: {
    type: "inheritance",
    emoji: "🏛️",
    label: "Received Inheritance",
    tagline: "Invest it wisely",
    description: "Inherited money, property, or other assets",
    colorClass: "border-amber-400 bg-amber-50 dark:bg-amber-950/20",
    heroBg: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    heroText: "text-amber-900 dark:text-amber-100",
    heroBorder: "border-amber-300 dark:border-amber-700",
    needsAmount: true,
    needsPropertyValue: false,
    isCrisis: false,
    category: "windfall",
  },
  marriage: {
    type: "marriage",
    emoji: "💍",
    label: "Getting Married",
    tagline: "Combine finances right",
    description: "Planning your financial life as a couple",
    colorClass: "border-primary/50 bg-primary/5",
    heroBg: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20",
    heroText: "text-purple-900 dark:text-purple-100",
    heroBorder: "border-purple-300 dark:border-purple-700",
    needsAmount: false,
    needsPropertyValue: false,
    isCrisis: false,
    category: "milestone",
  },
  new_baby: {
    type: "new_baby",
    emoji: "👶",
    label: "New Baby",
    tagline: "Prepare financially",
    description: "Planning for a newborn's arrival and future",
    colorClass: "border-green-400 bg-green-50 dark:bg-green-950/20",
    heroBg: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20",
    heroText: "text-green-900 dark:text-green-100",
    heroBorder: "border-green-300 dark:border-green-700",
    needsAmount: false,
    needsPropertyValue: false,
    isCrisis: false,
    category: "milestone",
  },
  job_loss: {
    type: "job_loss",
    emoji: "💼",
    label: "Lost My Job",
    tagline: "Survive and recover fast",
    description: "Unemployment, layoff, or sudden income loss",
    colorClass: "border-red-400 bg-red-50 dark:bg-red-950/20",
    heroBg: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20",
    heroText: "text-red-900 dark:text-red-100",
    heroBorder: "border-red-300 dark:border-red-700",
    needsAmount: false,
    needsPropertyValue: false,
    isCrisis: true,
    category: "milestone",
  },
  home_purchase: {
    type: "home_purchase",
    emoji: "🏡",
    label: "Buying a Home",
    tagline: "How much down, what's next?",
    description: "Planning finances around a property purchase",
    colorClass: "border-blue-400 bg-blue-50 dark:bg-blue-950/20",
    heroBg: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20",
    heroText: "text-blue-900 dark:text-blue-100",
    heroBorder: "border-blue-300 dark:border-blue-700",
    needsAmount: false,
    needsPropertyValue: true,
    isCrisis: false,
    category: "milestone",
  },
};

// Helper to build final payload from form state
export function buildLifeEventPayload(form: LifeEventFormState): LifeEventPayload {
  const meta = EVENT_META[form.event_type!];
  const num = (v: string) => Number(v) || 0;
  const monthlyGross = num(form.monthly_gross_income);
  const age = num(form.age);

  return {
    age,
    city: form.city.trim() || "Mumbai",
    employment_type: form.employment_type,
    dependents: 0,
    monthly_gross_income: monthlyGross,
    monthly_expenses: num(form.monthly_expenses),
    emergency_fund: num(form.emergency_fund),
    risk_profile: "moderate",
    retirement_age: Math.max(age + 1, 60),
    assets: { equity: 0, debt: 0, gold: 0, real_estate: 0, cash: 0, ppf_epf: 0, other: 0 },
    debts: form.debts,
    insurance: {
      has_term_life: form.has_term_life,
      term_cover: num(form.term_cover),
      has_health: form.has_health,
      health_cover: num(form.health_cover),
      has_critical_illness: false,
    },
    tax_deductions: {
      section_80c: 0, section_80d_self: 0, section_80d_self_is_senior: false,
      section_80d_parents: 0, section_80d_parents_are_senior: false,
      nps_80ccd_1b: 0, hra_claimed: 0, home_loan_interest: 0, other_deductions: 0,
    },
    goals: [],
    event_type: form.event_type!,
    event_amount: meta.needsAmount ? num(form.event_amount) : 0,
    event_details: meta.needsPropertyValue
      ? { property_value: num(form.property_value) }
      : {},
  };
}