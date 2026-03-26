// frontend/src/lib/health-score-types.ts

// ─── Enums (mirror backend exactly) ─────────────────────────────────────────

export type RiskProfile = "conservative" | "moderate" | "aggressive";
export type EmploymentType = "salaried" | "self_employed" | "business";
export type GoalType =
  | "retirement" | "house" | "education"
  | "marriage" | "emergency" | "vacation" | "custom";

// ─── Sub-objects ─────────────────────────────────────────────────────────────

export interface AssetAllocation {
  equity: number;
  debt: number;
  gold: number;
  real_estate: number;
  cash: number;
  ppf_epf: number;
  other: number;
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

export interface TaxDeductions {
  section_80c: number;
  section_80d_self: number;
  section_80d_self_is_senior: boolean;
  section_80d_parents: number;
  section_80d_parents_are_senior: boolean;
  nps_80ccd_1b: number;
  hra_claimed: number;
  home_loan_interest: number;
  other_deductions: number;
}

export interface Goal {
  type: GoalType;
  label: string;
  target_amount: number;
  target_year: number;
}

// ─── Full UserProfile payload (sent to POST /api/health-score) ───────────────

export interface HealthScorePayload {
  age: number;
  city: string;
  employment_type: EmploymentType;
  dependents: number;
  monthly_gross_income: number;
  monthly_expenses: number;
  emergency_fund: number;
  risk_profile: RiskProfile;
  retirement_age: number;
  assets: AssetAllocation;
  debts: DebtItem[];
  insurance: InsuranceCoverage;
  tax_deductions: TaxDeductions;
  goals: Goal[];
}

// ─── API Response types ───────────────────────────────────────────────────────

export interface DimensionScore {
  name: string;
  score: number;
  label: "Excellent" | "Good" | "Fair" | "Poor";
  insight: string;
}

export interface MoneyHealthResult {
  overall_score: number;
  grade: string;
  dimensions: DimensionScore[];
  monthly_surplus: number;
  total_net_worth: number;
}

export interface AgentAdvice {
  summary: string;
  key_actions: string[];
  risks: string[];
  disclaimer: string;
}

export interface HealthScoreApiResponse {
  session_id: string;
  profile: HealthScorePayload;
  result: MoneyHealthResult;
  advice: AgentAdvice;
  decision_log: unknown[];
}

// ─── Wizard state (flat form state for the 4 steps) ──────────────────────────

export interface WizardFormState {
  // Step 1
  age: string;
  city: string;
  employment_type: EmploymentType;
  dependents: number;
  risk_profile: RiskProfile;
  retirement_age: string;

  // Step 2 — income
  monthly_gross_income: string;
  monthly_expenses: string;
  emergency_fund: string;

  // Step 2 — assets
  assets: AssetAllocation;

  // Step 2 — debts
  debts: DebtItem[];

  // Step 3 — insurance
  insurance: InsuranceCoverage;

  // Step 4 — tax
  tax_deductions: TaxDeductions;
  goals: Goal[];
}

export const DEFAULT_FORM_STATE: WizardFormState = {
  age: "",
  city: "",
  employment_type: "salaried",
  dependents: 0,
  risk_profile: "moderate",
  retirement_age: "60",

  monthly_gross_income: "",
  monthly_expenses: "",
  emergency_fund: "",

  assets: {
    equity: 0, debt: 0, gold: 0,
    real_estate: 0, cash: 0, ppf_epf: 0, other: 0,
  },

  debts: [],

  insurance: {
    has_term_life: false, term_cover: 0,
    has_health: false, health_cover: 0,
    has_critical_illness: false,
  },

  tax_deductions: {
    section_80c: 0,
    section_80d_self: 0,
    section_80d_self_is_senior: false,
    section_80d_parents: 0,
    section_80d_parents_are_senior: false,
    nps_80ccd_1b: 0,
    hra_claimed: 0,
    home_loan_interest: 0,
    other_deductions: 0,
  },

  goals: [],
};