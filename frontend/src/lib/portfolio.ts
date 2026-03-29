// frontend/src/lib/portfolio.ts
// Portfolio API calls and shared profile types.

import { api } from "@/lib/api";
import { authService } from "@/lib/auth";
import type { WizardFormState } from "@/lib/health-score-types";
import type { FIREFormState } from "@/lib/fire-types";
import type { TaxFormState } from "@/lib/tax-types";
import type { LifeEventFormState } from "@/lib/life-event-types";
import type { PartnerFormState } from "@/lib/couple-types";

export type EmploymentType =
  | "salaried"
  | "self_employed"
  | "business"
  | "freelancer"
  | "retired";

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export type GoalType =
  | "house"
  | "education"
  | "marriage"
  | "retirement"
  | "vacation"
  | "custom";

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

export interface UserProfile {
  age: number;
  city: string;
  employment_type: EmploymentType;
  dependents: number;
  monthly_gross_income: number;
  monthly_expenses: number;
  emergency_fund: number;
  retirement_age: number;
  risk_profile: RiskProfile;
  assets: AssetAllocation;
  debts: DebtItem[];
  insurance: InsuranceCoverage;
  tax_deductions: TaxDeductions;
  goals: Goal[];
}

export interface PortfolioResponse {
  user_id: string;
  profile: Partial<UserProfile> | Record<string, unknown>;
  fire: Record<string, unknown>;
  health: Record<string, unknown>;
  tax: Record<string, unknown>;
  mf: Record<string, unknown>;
  couple: Record<string, unknown>;
  life_event: Record<string, unknown>;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  feature: string;
  session_type: "portfolio" | "scenario";
  created_at: string;
  result: Record<string, unknown>;
}

export interface ScenarioDetail extends ScenarioSummary {
  input_data: Record<string, unknown>;
}

export const DEFAULT_PROFILE: UserProfile = {
  age: 0,
  city: "",
  employment_type: "salaried",
  dependents: 0,
  monthly_gross_income: 0,
  monthly_expenses: 0,
  emergency_fund: 0,
  retirement_age: 60,
  risk_profile: "moderate",
  assets: {
    equity: 0,
    debt: 0,
    gold: 0,
    real_estate: 0,
    cash: 0,
    ppf_epf: 0,
    other: 0,
  },
  debts: [],
  insurance: {
    has_term_life: false,
    term_cover: 0,
    has_health: false,
    health_cover: 0,
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

function authHeaders(): Record<string, string> {
  const token = authService.getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export function isProfileEmpty(portfolio: PortfolioResponse): boolean {
  const profile = portfolio.profile as Partial<UserProfile>;
  return !profile || Object.keys(profile).length === 0 || !profile.monthly_gross_income;
}

export async function getPortfolio(): Promise<PortfolioResponse> {
  return authService.authenticatedRequest(() =>
    api.get<PortfolioResponse>("/api/portfolio", authHeaders())
  );
}

export async function updatePortfolioProfile(profile: UserProfile): Promise<PortfolioResponse> {
  return authService.authenticatedRequest(() =>
    api.patch<PortfolioResponse>("/api/portfolio/profile", profile, authHeaders())
  );
}

export async function listScenarios(feature?: string, sessionType?: "portfolio" | "scenario"): Promise<ScenarioSummary[]> {
  const queryParams = new URLSearchParams();
  if (feature) queryParams.append("feature", feature);
  if (sessionType) queryParams.append("session_type", sessionType);
  const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
  
  return authService.authenticatedRequest(() =>
    api.get<ScenarioSummary[]>(`/api/portfolio/scenarios${query}`, authHeaders())
  );
}

export async function getScenario(id: string): Promise<ScenarioDetail> {
  return authService.authenticatedRequest(() =>
    api.get<ScenarioDetail>(`/api/portfolio/scenarios/${id}`, authHeaders())
  );
}

export async function deleteScenario(id: string): Promise<void> {
  return authService.authenticatedRequest(() =>
    api.delete<void>(`/api/portfolio/scenarios/${id}`, authHeaders())
  );
}

// Each mapper is pure: no API calls, no side effects.

/** UserProfile -> Health Score WizardFormState (string fields stay string). */
export function portfolioToHealthScoreForm(p: UserProfile): Partial<WizardFormState> {
  return {
    age: p.age > 0 ? String(p.age) : "",
    city: p.city || "",
    employment_type:
      p.employment_type === "freelancer" || p.employment_type === "retired"
        ? "self_employed"
        : (p.employment_type as WizardFormState["employment_type"]),
    dependents: p.dependents,
    risk_profile: p.risk_profile,
    retirement_age: p.retirement_age > 0 ? String(p.retirement_age) : "60",
    monthly_gross_income: p.monthly_gross_income > 0 ? String(p.monthly_gross_income) : "",
    monthly_expenses: p.monthly_expenses > 0 ? String(p.monthly_expenses) : "",
    emergency_fund: p.emergency_fund > 0 ? String(p.emergency_fund) : "",
    assets: { ...p.assets },
    debts: p.debts.map((d) => ({ ...d })),
    insurance: { ...p.insurance },
    tax_deductions: { ...p.tax_deductions },
    goals: p.goals.map((g) => ({ ...g })),
  };
}

/** UserProfile -> FIRE FIREFormState. */
export function portfolioToFIREForm(p: UserProfile): Partial<FIREFormState> {
  const totalEMI = p.debts.reduce((s, d) => s + d.emi, 0);
  return {
    age: p.age > 0 ? String(p.age) : "",
    city: p.city || "",
    employment_type:
      p.employment_type === "freelancer" || p.employment_type === "retired"
        ? "self_employed"
        : (p.employment_type as FIREFormState["employment_type"]),
    retirement_age: p.retirement_age > 0 ? String(p.retirement_age) : "50",
    risk_profile: p.risk_profile,
    monthly_gross_income: p.monthly_gross_income > 0 ? String(p.monthly_gross_income) : "",
    monthly_expenses: p.monthly_expenses > 0 ? String(p.monthly_expenses) : "",
    total_emi: totalEMI > 0 ? String(totalEMI) : "0",
    assets: { ...p.assets },
    goals: p.goals.map((g) => ({ ...g })),
  };
}

/** UserProfile -> Tax TaxFormState. */
export function portfolioToTaxForm(p: UserProfile): Partial<TaxFormState> {
  const td = p.tax_deductions;
  return {
    age: p.age > 0 ? String(p.age) : "",
    city: p.city || "",
    employment_type:
      p.employment_type === "freelancer" || p.employment_type === "retired"
        ? "self_employed"
        : (p.employment_type as TaxFormState["employment_type"]),
    annual_gross_income: p.monthly_gross_income > 0 ? String(p.monthly_gross_income * 12) : "",
    section_80c: td.section_80c > 0 ? String(td.section_80c) : "",
    section_80d_self: td.section_80d_self > 0 ? String(td.section_80d_self) : "",
    section_80d_self_is_senior: td.section_80d_self_is_senior,
    section_80d_parents: td.section_80d_parents > 0 ? String(td.section_80d_parents) : "",
    section_80d_parents_are_senior: td.section_80d_parents_are_senior,
    nps_80ccd_1b: td.nps_80ccd_1b > 0 ? String(td.nps_80ccd_1b) : "",
    hra_claimed: td.hra_claimed > 0 ? String(td.hra_claimed) : "",
    home_loan_interest: td.home_loan_interest > 0 ? String(td.home_loan_interest) : "",
    other_deductions: td.other_deductions > 0 ? String(td.other_deductions) : "",
  };
}

/** UserProfile -> Life Event LifeEventFormState (profile fields only). */
export function portfolioToLifeEventForm(p: UserProfile): Partial<LifeEventFormState> {
  return {
    age: p.age > 0 ? String(p.age) : "",
    city: p.city || "",
    employment_type:
      p.employment_type === "freelancer" || p.employment_type === "retired"
        ? "self_employed"
        : (p.employment_type as LifeEventFormState["employment_type"]),
    monthly_gross_income: p.monthly_gross_income > 0 ? String(p.monthly_gross_income) : "",
    monthly_expenses: p.monthly_expenses > 0 ? String(p.monthly_expenses) : "",
    emergency_fund: p.emergency_fund > 0 ? String(p.emergency_fund) : "",
    has_term_life: p.insurance.has_term_life,
    term_cover: p.insurance.term_cover > 0 ? String(p.insurance.term_cover) : "",
    has_health: p.insurance.has_health,
    health_cover: p.insurance.health_cover > 0 ? String(p.insurance.health_cover) : "",
    debts: p.debts.map((d) => ({ ...d })),
  };
}

/** UserProfile -> Couple PartnerFormState (for Partner A only). */
export function portfolioToPartnerForm(p: UserProfile): Partial<PartnerFormState> {
  return {
    age: p.age > 0 ? String(p.age) : "",
    city: p.city || "",
    employment_type:
      p.employment_type === "freelancer" || p.employment_type === "retired"
        ? "self_employed"
        : (p.employment_type as PartnerFormState["employment_type"]),
    monthly_gross_income: p.monthly_gross_income > 0 ? String(p.monthly_gross_income) : "",
    monthly_expenses: p.monthly_expenses > 0 ? String(p.monthly_expenses) : "",
    emergency_fund: p.emergency_fund > 0 ? String(p.emergency_fund) : "",
    retirement_age: p.retirement_age > 0 ? String(p.retirement_age) : "60",
    has_term_life: p.insurance.has_term_life,
    term_cover: p.insurance.term_cover > 0 ? String(p.insurance.term_cover) : "",
    has_health: p.insurance.has_health,
    health_cover: p.insurance.health_cover > 0 ? String(p.insurance.health_cover) : "",
    debts: p.debts.map((d) => ({ ...d })),
    equity: p.assets.equity > 0 ? String(p.assets.equity) : "",
    debt_assets: p.assets.debt > 0 ? String(p.assets.debt) : "",
    gold: p.assets.gold > 0 ? String(p.assets.gold) : "",
    real_estate: p.assets.real_estate > 0 ? String(p.assets.real_estate) : "",
    cash: p.assets.cash > 0 ? String(p.assets.cash) : "",
    ppf_epf: p.assets.ppf_epf > 0 ? String(p.assets.ppf_epf) : "",
    section_80c: p.tax_deductions.section_80c > 0 ? String(p.tax_deductions.section_80c) : "",
    nps_80ccd_1b: p.tax_deductions.nps_80ccd_1b > 0 ? String(p.tax_deductions.nps_80ccd_1b) : "",
    hra_claimed: p.tax_deductions.hra_claimed > 0 ? String(p.tax_deductions.hra_claimed) : "",
  };
}
