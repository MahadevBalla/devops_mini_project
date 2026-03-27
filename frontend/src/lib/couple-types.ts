// frontend/src/lib/couple-types.ts
// Mirrors backend models/couple.py + models/user.py

export type EmploymentType = "salaried" | "self_employed" | "business";
export type RiskProfile    = "conservative" | "moderate" | "aggressive";
export type GoalType =
  | "retirement" | "house" | "education"
  | "marriage"   | "emergency" | "vacation" | "custom";

// ─── Sub-models (mirrors user.py) ────────────────────────────────────────────
export interface DebtItem {
  name: string;
  outstanding: number;
  emi: number;
  interest_rate: number;
  is_secured: boolean;
}

export interface AssetAllocation {
  equity: number; debt: number; gold: number;
  real_estate: number; cash: number; ppf_epf: number; other: number;
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

export interface JointGoal {
  type: GoalType;
  label: string;
  target_amount: number;
  target_year: number;
}

// ─── Partner form state (what the UI collects) ────────────────────────────────
export interface PartnerFormState {
  // always visible
  age: string;
  city: string;
  employment_type: EmploymentType;
  monthly_gross_income: string;
  monthly_expenses: string;
  emergency_fund: string;
  retirement_age: string;

  // insurance section
  has_term_life: boolean;
  term_cover: string;
  has_health: boolean;
  health_cover: string;

  // debts section
  debts: DebtItem[];

  // assets section
  equity: string; debt_assets: string; gold: string;
  real_estate: string; cash: string; ppf_epf: string;

  // tax deductions section
  section_80c: string;
  nps_80ccd_1b: string;
  hra_claimed: string;
}

export const DEFAULT_PARTNER: PartnerFormState = {
  age: "", city: "", employment_type: "salaried",
  monthly_gross_income: "", monthly_expenses: "",
  emergency_fund: "", retirement_age: "60",
  has_term_life: false, term_cover: "",
  has_health: false, health_cover: "",
  debts: [],
  equity: "", debt_assets: "", gold: "",
  real_estate: "", cash: "", ppf_epf: "",
  section_80c: "", nps_80ccd_1b: "", hra_claimed: "",
};

// ─── Full wizard state ────────────────────────────────────────────────────────
export interface CoupleFormState {
  // Step 1
  name_a: string;
  name_b: string;
  relationship: "married" | "living_together" | "planning";

  // Steps 2 & 3
  partner_a: PartnerFormState;
  partner_b: PartnerFormState;

  // Step 4
  joint_goals: JointGoal[];
}

export const DEFAULT_COUPLE_FORM: CoupleFormState = {
  name_a: "", name_b: "",
  relationship: "married",
  partner_a: { ...DEFAULT_PARTNER },
  partner_b: { ...DEFAULT_PARTNER },
  joint_goals: [],
};

// ─── API types (mirrors CoupleOptimisation) ───────────────────────────────────
export interface CoupleResult {
  combined_net_worth: number;
  combined_monthly_surplus: number;
  better_hra_claimant: string;   // "partner_a" | "partner_b"
  hra_savings: number;
  nps_matching_benefit: number;
  partner_a_sip: number;
  partner_b_sip: number;
  joint_tax_saving: number;
  joint_insurance_recommendation: string;
  recommendations: string[];
}

export interface CoupleApiResponse {
  session_id: string;
  result: CoupleResult;
  advice: {
    summary: string;
    key_actions: string[];
    risks: string[];
    disclaimer: string;
  };
  decision_log: unknown[];
}

// ─── Payload builder ──────────────────────────────────────────────────────────
function buildPartnerPayload(p: PartnerFormState) {
  const n = (v: string) => Number(v) || 0;
  const age = n(p.age);
  const retAge = Math.max(n(p.retirement_age) || 60, age + 1);

  return {
    age,
    city: p.city.trim() || "Mumbai",
    employment_type: p.employment_type,
    dependents: 0,
    monthly_gross_income: n(p.monthly_gross_income),
    monthly_expenses: n(p.monthly_expenses),
    emergency_fund: n(p.emergency_fund),
    retirement_age: retAge,
    risk_profile: "moderate" as RiskProfile,
    assets: {
      equity:      n(p.equity),
      debt:        n(p.debt_assets),
      gold:        n(p.gold),
      real_estate: n(p.real_estate),
      cash:        n(p.cash),
      ppf_epf:     n(p.ppf_epf),
      other:       0,
    },
    debts: p.debts,
    insurance: {
      has_term_life:       p.has_term_life,
      term_cover:          n(p.term_cover),
      has_health:          p.has_health,
      health_cover:        n(p.health_cover),
      has_critical_illness: false,
    },
    tax_deductions: {
      section_80c:                  Math.min(n(p.section_80c), 150000),
      section_80d_self:             0,
      section_80d_self_is_senior:   false,
      section_80d_parents:          0,
      section_80d_parents_are_senior: false,
      nps_80ccd_1b:                 Math.min(n(p.nps_80ccd_1b), 50000),
      hra_claimed:                  n(p.hra_claimed),
      home_loan_interest:           0,
      other_deductions:             0,
    },
    goals: [],
  };
}

export function buildCouplePayload(form: CoupleFormState): Record<string, unknown> {
  return {
    partner_a:   buildPartnerPayload(form.partner_a),
    partner_b:   buildPartnerPayload(form.partner_b),
    is_married:  form.relationship === "married",
    joint_goals: form.joint_goals.map((g) => ({
      type:          g.type,
      label:         g.label,
      target_amount: g.target_amount,
      target_year:   g.target_year,
    })),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const fmt = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

export const fmtShort = (n: number): string => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
};

// Standard SIP future value: P * [((1+r)^n - 1) / r] * (1+r)
// r = monthly rate, n = months
export function sipCorpusProjection(
  monthlySip: number,
  years: number,
  annualRate = 0.12
): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0 || monthlySip <= 0 || years <= 0) return 0;
  return monthlySip * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
}

// Parse "partner_a" | "partner_b" → display name
export function resolvePartnerName(
  key: string,
  nameA: string,
  nameB: string
): string {
  if (key === "partner_a") return nameA || "Partner A";
  if (key === "partner_b") return nameB || "Partner B";
  return key;
}

// Parse joint_insurance_recommendation string into array
export function parseInsuranceRecs(rec: string): string[] {
  if (!rec) return [];
  return rec.split("; ").map((s) => s.trim()).filter(Boolean);
}