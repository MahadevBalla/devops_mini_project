// frontend/src/lib/demo-data.ts
// Circuit breaker for demo mode. Flip DEMO_MODE to true if API times out during pitch.
// All constants are typed against actual backend response shapes.

import type { TaxApiResponse } from "@/lib/tax-types";
import type { FIREApiResponse } from "@/lib/fire-types";
import type { HealthScoreApiResponse } from "@/lib/health-score-types";
import type { MFXRayApiResponse } from "@/lib/mf-xray-types";

export const DEMO_MODE = false;

// ─── Tax Wizard ───────────────────────────────────────────────────────────────
// Persona: 28-year-old salaried in Mumbai, ₹18L gross, old regime saves ₹47,200
export const DEMO_TAX_RESULT: TaxApiResponse = {
    session_id: "demo-tax-001",
    profile: {
        age: 28,
        city: "Mumbai",
        employment_type: "salaried",
        dependents: 0,
        monthly_gross_income: 150000,
        monthly_expenses: 60000,
        emergency_fund: 300000,
        risk_profile: "moderate",
        retirement_age: 55,
        assets: { equity: 500000, debt: 100000, gold: 50000, real_estate: 0, cash: 100000, ppf_epf: 150000, other: 0 },
        debts: [],
        insurance: { has_term_life: false, term_cover: 0, has_health: false, health_cover: 0, has_critical_illness: false },
        tax_deductions: {
            section_80c: 150000,
            section_80d_self: 25000,
            section_80d_self_is_senior: false,
            section_80d_parents: 0,
            section_80d_parents_are_senior: false,
            nps_80ccd_1b: 50000,
            hra_claimed: 96000,
            home_loan_interest: 0,
            other_deductions: 0,
        },
        goals: [],
    },
    result: {
        gross_income: 1800000,
        old_regime_tax: 189400,
        new_regime_tax: 236600,
        recommended_regime: "old",
        savings_by_switching: 47200,
        effective_rate_old: 10.5,
        effective_rate_new: 13.1,
        missing_deductions: [
            "NPS 80CCD(1B) — ₹50,000 additional deduction not claimed",
            "Health Insurance 80D — parents coverage up to ₹25,000",
            "Home Loan Interest — if applicable, saves up to ₹2,00,000",
        ],
        deduction_potential: 75000,
    },
    advice: {
        summary: "You're on the old regime and saving ₹47,200 vs the new regime. With full NPS and 80D utilisation, you could save an additional ₹22,500 in taxes this year.",
        key_actions: [
            "Max out NPS 80CCD(1B) contribution of ₹50,000 before March 31",
            "Get a health insurance policy for parents — claim up to ₹25,000 under 80D",
            "Ensure your 80C investments are locked in before year-end",
        ],
        risks: ["Switching to new regime loses all deduction benefits"],
        disclaimer: "This is an estimate based on provided information. Consult a CA for final tax filing.",
        regime_suggestion: "Stay on old regime — saves ₹47,200 annually",
    },
    decision_log: [],
};

// ─── FIRE Planner ─────────────────────────────────────────────────────────────
// Persona: 28-year-old, retiring at 50, ₹1.8L/month income, on track
export const DEMO_FIRE_RESULT: FIREApiResponse = {
    session_id: "demo-fire-001",
    profile: {
        age: 28,
        city: "Mumbai",
        employment_type: "salaried",
        dependents: 0,
        monthly_gross_income: 150000,
        monthly_expenses: 60000,
        emergency_fund: 300000,
        risk_profile: "moderate",
        retirement_age: 50,
        assets: { equity: 500000, debt: 100000, gold: 50000, real_estate: 0, cash: 100000, ppf_epf: 150000, other: 0 },
        debts: [],
        insurance: { has_term_life: false, term_cover: 0, has_health: false, health_cover: 0, has_critical_illness: false },
        tax_deductions: {
            section_80c: 150000,
            section_80d_self: 0,
            section_80d_self_is_senior: false,
            section_80d_parents: 0,
            section_80d_parents_are_senior: false,
            nps_80ccd_1b: 0,
            hra_claimed: 0,
            home_loan_interest: 0,
            other_deductions: 0,
        },
        goals: [
            { type: "retirement", label: "FIRE", target_amount: 60000000, target_year: 2046 },
        ],
    },
    result: {
        fi_corpus_required: 60000000,
        current_corpus: 900000,
        corpus_gap: 59100000,
        required_monthly_sip: 42000,
        required_stepup_sip: 35000,
        stepup_rate: 10,
        projected_fi_age: 48,
        years_to_fi: 20,
        monthly_retirement_expense: 120000,
        on_track: true,
        sip_goals: [
            {
                goal_label: "FIRE Corpus",
                target_amount: 60000000,
                target_year: 2046,
                required_monthly_sip: 42000,
                required_stepup_sip: 35000,
                stepup_rate: 10,
                current_on_track: true,
            },
        ],
        yearly_projections: [
            { year: 2026, age: 28, sip: 42000, corpus: 900000, invested: 900000 },
            { year: 2027, age: 29, sip: 42000, corpus: 1550000, invested: 1404000 },
            { year: 2028, age: 30, sip: 42000, corpus: 2350000, invested: 1908000 },
            { year: 2029, age: 31, sip: 42000, corpus: 3320000, invested: 2412000 },
            { year: 2030, age: 32, sip: 42000, corpus: 4490000, invested: 2916000 },
            { year: 2031, age: 33, sip: 42000, corpus: 5900000, invested: 3420000 },
            { year: 2032, age: 34, sip: 42000, corpus: 7590000, invested: 3924000 },
            { year: 2033, age: 35, sip: 42000, corpus: 9610000, invested: 4428000 },
            { year: 2034, age: 36, sip: 42000, corpus: 12020000, invested: 4932000 },
            { year: 2035, age: 37, sip: 42000, corpus: 14900000, invested: 5436000 },
            { year: 2036, age: 38, sip: 42000, corpus: 18330000, invested: 5940000 },
            { year: 2037, age: 39, sip: 42000, corpus: 22420000, invested: 6444000 },
            { year: 2038, age: 40, sip: 42000, corpus: 27300000, invested: 6948000 },
            { year: 2039, age: 41, sip: 42000, corpus: 33120000, invested: 7452000 },
            { year: 2040, age: 42, sip: 42000, corpus: 40060000, invested: 7956000 },
            { year: 2041, age: 43, sip: 42000, corpus: 48310000, invested: 8460000 },
            { year: 2042, age: 44, sip: 42000, corpus: 58120000, invested: 8964000 },
            { year: 2043, age: 45, sip: 42000, corpus: 60000000, invested: 9468000 },
        ],
    },
    advice: {
        summary: "You're ahead of schedule. At your current SIP of ₹42,000/month with 10% annual step-up, you're projected to hit your ₹6 Cr FIRE corpus by age 48 — 2 years early. The key risk is lifestyle inflation eating into your savings rate.",
        key_actions: [
            "Maintain 28%+ savings rate as income grows",
            "Increase SIP by 10% every April",
            "Build 12-month emergency fund before aggressive equity allocation",
            "Review corpus target at age 35 — factor in inflation adjustments",
        ],
        risks: [
            "Lifestyle inflation could reduce savings rate",
            "Market downturns in early accumulation phase have outsized impact",
        ],
        disclaimer: "Projections assume 11% CAGR on equity. Actual returns may vary.",
    },
    decision_log: [],
};

// ─── Health Score ─────────────────────────────────────────────────────────────
// Persona: same 28-year-old, score 72/100, grade B
export const DEMO_HEALTH_RESULT: HealthScoreApiResponse = {
    session_id: "demo-health-001",
    profile: {
        age: 28,
        city: "Mumbai",
        employment_type: "salaried",
        dependents: 0,
        monthly_gross_income: 150000,
        monthly_expenses: 60000,
        emergency_fund: 300000,
        risk_profile: "moderate",
        retirement_age: 55,
        assets: { equity: 500000, debt: 100000, gold: 50000, real_estate: 0, cash: 100000, ppf_epf: 150000, other: 0 },
        debts: [],
        insurance: { has_term_life: false, term_cover: 0, has_health: false, health_cover: 0, has_critical_illness: false },
        tax_deductions: {
            section_80c: 150000,
            section_80d_self: 25000,
            section_80d_self_is_senior: false,
            section_80d_parents: 0,
            section_80d_parents_are_senior: false,
            nps_80ccd_1b: 50000,
            hra_claimed: 96000,
            home_loan_interest: 0,
            other_deductions: 0,
        },
        goals: [],
    },
    result: {
        overall_score: 72,
        grade: "B",
        dimensions: [
            { name: "Savings Rate", score: 82, label: "Good", insight: "You save 28% of gross income — above the 20% benchmark. Aim for 30%." },
            { name: "Emergency Fund", score: 60, label: "Fair", insight: "3-month buffer exists but 6 months is recommended. Add ₹60,000 to reach safety threshold." },
            { name: "Debt Management", score: 95, label: "Excellent", insight: "Zero consumer debt. Excellent foundation for wealth building." },
            { name: "Insurance Coverage", score: 40, label: "Poor", insight: "No term life or health cover detected. A ₹1 Cr term plan costs ~₹800/month at your age." },
            { name: "Investment Growth", score: 78, label: "Good", insight: "Equity-heavy allocation suits your age. Rebalance to 70:30 equity-debt by age 35." },
            { name: "Retirement Readiness", score: 74, label: "Good", insight: "On track for FIRE at 48. Consistent step-ups will keep you ahead." },
        ],
        monthly_surplus: 55000,
        total_net_worth: 900000,
    },
    advice: {
        summary: "Your financial health score is 72/100 — solid for age 28 with zero debt and a strong savings rate. The two gaps pulling your score down are insurance coverage and emergency fund depth. Fix both before increasing investment exposure.",
        key_actions: [
            "Buy a ₹1 Cr term life plan — costs ~₹800/month, irreplaceable protection",
            "Add ₹60,000 to emergency fund to reach 6-month buffer",
            "Open a health insurance policy (₹5L cover) before group cover lapses",
        ],
        risks: [
            "No term insurance is the single biggest financial risk at this stage",
            "Emergency fund insufficient for Mumbai cost-of-living",
        ],
        disclaimer: "Score is based on declared data. Consult a financial advisor for personalised advice.",
    },
    decision_log: [],
};

// ─── MF X-Ray ─────────────────────────────────────────────────────────────────
// Persona: 3-fund portfolio, 22% overlap between two large caps, XIRR 14.2%
export const DEMO_MF_RESULT: MFXRayApiResponse = {
    session_id: "demo-mf-001",
    result: {
        total_invested: 500000,
        total_current_value: 623000,
        overall_xirr: 14.2,
        benchmark_conservative: 9.5,
        benchmark_base: 11.5,
        benchmark_optimistic: 13.0,
        xirr_vs_benchmark: 2.7,
        absolute_return_pct: 24.6,
        holdings: [
            {
                scheme_name: "Mirae Asset Large Cap Fund - Direct Growth",
                isin: "INF769K01010",
                units: 412.5,
                avg_nav: 485.2,
                current_nav: 601.4,
                invested_amount: 200000,
                current_value: 248000,
                xirr: 15.1,
                expense_ratio: 0.54,
                category: "Large Cap",
            },
            {
                scheme_name: "Parag Parikh Flexi Cap Fund - Direct Growth",
                isin: "INF879O01019",
                units: 284.1,
                avg_nav: 422.0,
                current_nav: 598.7,
                invested_amount: 120000,
                current_value: 170100,
                xirr: 17.3,
                expense_ratio: 0.63,
                category: "Flexi/Multi Cap",
            },
            {
                scheme_name: "Axis Midcap Fund - Direct Growth",
                isin: "INF846K01EW2",
                units: 198.3,
                avg_nav: 908.5,
                current_nav: 1031.2,
                invested_amount: 180000,
                current_value: 204500,
                xirr: 10.8,
                expense_ratio: 0.51,
                category: "Mid Cap",
            },
        ],
        overlapping_pairs: [
            {
                fund_a: "Mirae Asset Large Cap Fund - Direct Growth",
                fund_b: "Parag Parikh Flexi Cap Fund - Direct Growth",
                overlap_percent: 34,
                common_stocks: ["HDFC Bank", "Infosys", "ICICI Bank", "Reliance Industries"],
            },
        ],
        category_breakdown: {
            "Large Cap": 39.8,
            "Flexi/Multi Cap": 27.3,
            "Mid Cap": 32.9,
        },
        high_expense_funds: [],
        rebalancing_suggestions: [
            "Consider reducing Mirae Large Cap allocation — 34% overlap with PPFCF reduces diversification benefit",
            "Axis Midcap underperforming vs category average (10.8% vs 13.2%). Review after 1 more quarter.",
        ],
    },
    advice: {
        summary: "Your portfolio XIRR of 14.2% beats the benchmark by 2.7 percentage points — strong performance. The main issue is 34% overlap between Mirae Large Cap and PPFCF, which reduces your effective diversification. Consider replacing Mirae with a pure index fund.",
        key_actions: [
            "Replace Mirae Large Cap with Nifty 50 Index Fund to cut costs and remove overlap",
            "Increase Axis Midcap SIP after one more quarter review",
            "All funds are direct plans with sub-0.7% expense ratios — no action needed there",
        ],
        risks: [
            "34% overlap means large cap drawdowns hit 67% of your portfolio simultaneously",
            "Midcap allocation (33%) may be high for a moderate risk profile",
        ],
        disclaimer: "XIRR is calculated on available NAV data. Past performance is not indicative of future returns.",
    },
    decision_log: [],
};
