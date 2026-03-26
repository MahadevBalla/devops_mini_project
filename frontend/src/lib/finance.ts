/**
 * Finance API service — typed wrappers for all 6 backend endpoints
 */
import { api } from "@/lib/api";

// ─── Shared types ────────────────────────────────────────────────────────────

export interface FinanceAdvice {
  summary: string;
  key_actions: string[];
  risks: string[];
  disclaimer: string;
}

// ─── Health Score ─────────────────────────────────────────────────────────────

export interface HealthScoreDimension {
  name: string;
  score: number;
  label: string;
  insight: string;
}

export interface HealthScoreResult {
  overall_score: number;
  grade: string;
  dimensions: HealthScoreDimension[];
  monthly_surplus: number;
  total_net_worth: number;
}

export interface HealthScoreResponse {
  session_id: string;
  profile: Record<string, unknown>;
  result: HealthScoreResult;
  advice: FinanceAdvice;
  decision_log: unknown[];
}

export async function getHealthScore(data: Record<string, unknown>): Promise<HealthScoreResponse> {
  return api.post<HealthScoreResponse>("/api/health-score", data);
}

// ─── FIRE Planner ─────────────────────────────────────────────────────────────

export interface SIPGoal {
  goal_label: string;
  target_amount: number;
  target_year: number;
  required_monthly_sip: number;
  required_stepup_sip: number;
  stepup_rate: number;
  current_on_track: boolean;
}

export interface FIREResult {
  fi_corpus_required: number;
  current_corpus: number;
  corpus_gap: number;
  required_monthly_sip: number;
  required_stepup_sip: number;
  stepup_rate: number;
  projected_fi_age: number | null;
  years_to_fi: number;
  monthly_retirement_expense: number;
  on_track: boolean;
  sip_goals: SIPGoal[];
}

export interface FIREResponse {
  session_id: string;
  profile: Record<string, unknown>;
  result: FIREResult;
  advice: FinanceAdvice;
  decision_log: unknown[];
}

export async function getFIREPlan(data: Record<string, unknown>): Promise<FIREResponse> {
  return api.post<FIREResponse>("/api/fire-planner", data);
}

// ─── Tax Wizard ───────────────────────────────────────────────────────────────

export interface TaxResult {
  gross_income: number;
  old_regime_tax: number;
  new_regime_tax: number;
  recommended_regime: "old" | "new";
  savings_by_switching: number;
  effective_rate_old: number;
  effective_rate_new: number;
  missing_deductions: string[];
  deduction_potential: number;
}

export interface TaxResponse {
  session_id: string;
  profile: Record<string, unknown>;
  result: TaxResult;
  advice: FinanceAdvice & { regime_suggestion: string };
  decision_log: unknown[];
}

export async function getTaxAnalysis(data: Record<string, unknown>): Promise<TaxResponse> {
  return api.post<TaxResponse>("/api/tax-wizard", data);
}

// ─── Life Event ───────────────────────────────────────────────────────────────

export type LifeEventType = "bonus" | "inheritance" | "marriage" | "new_baby" | "job_loss" | "home_purchase";

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

export interface LifeEventResponse {
  session_id: string;
  result: LifeEventResult;
  advice: FinanceAdvice;
  decision_log: unknown[];
}

export async function getLifeEventPlan(data: Record<string, unknown>): Promise<LifeEventResponse> {
  return api.post<LifeEventResponse>("/api/life-event", data);
}

// ─── Couple Planner ───────────────────────────────────────────────────────────

export interface CouplePlanResult {
  combined_net_worth: number;
  combined_monthly_surplus: number;
  better_hra_claimant: string;
  hra_savings: number;
  nps_matching_benefit: number;
  partner_a_sip: number;
  partner_b_sip: number;
  joint_tax_saving: number;
  joint_insurance_recommendation: string;
  recommendations: string[];
}

export interface CouplePlanResponse {
  session_id: string;
  result: CouplePlanResult;
  advice: FinanceAdvice;
  decision_log: unknown[];
}

export async function getCouplePlan(data: Record<string, unknown>): Promise<CouplePlanResponse> {
  return api.post<CouplePlanResponse>("/api/couple-planner", data);
}

// ─── MF X-Ray ─────────────────────────────────────────────────────────────────

export interface MFHolding {
  scheme_name: string;
  isin: string;
  units: number;
  avg_nav: number;
  current_nav?: number;
  invested_amount: number;
  current_value: number;
  expense_ratio?: number;
  category: string;
}

export interface OverlapPair {
  fund_a: string;
  fund_b: string;
  overlap_percent: number;
  common_stocks: string[];
}

export interface MFXrayResult {
  total_invested: number;
  total_current_value: number;
  overall_xirr: number;
  absolute_return_pct: number;
  holdings: MFHolding[];
  overlapping_pairs: OverlapPair[];
  category_breakdown: Record<string, number>;
  high_expense_funds: string[];
  rebalancing_suggestions: string[];
}

export interface MFXrayResponse {
  session_id: string;
  result: MFXrayResult;
  advice: FinanceAdvice;
  decision_log: unknown[];
}

export async function getMFXray(file: File): Promise<MFXrayResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${baseURL}/api/mf-xray`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Upload failed", code: "UPLOAD_ERROR" }));
    throw new Error(err.error || "Upload failed");
  }
  return response.json();
}
