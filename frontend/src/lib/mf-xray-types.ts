// frontend/src/lib/mf-xray-types.ts
// Mirrors backend models/mf_xray.py exactly

// ─── Core models ──────────────────────────────────────────────────────────────
export interface MFHolding {
  scheme_name: string;
  isin: string;
  units: number;
  avg_nav: number;
  current_nav: number;
  invested_amount: number;
  current_value: number;
  xirr?: number | null;
  expense_ratio?: number | null;
  category: string;
}

export interface OverlapPair {
  fund_a: string;
  fund_b: string;
  overlap_percent: number;
  common_stocks: string[];
}

export interface MFXRayResult {
  total_invested: number;
  total_current_value: number;
  overall_xirr: number | null;
  benchmark_conservative: number;   // 9.5 — from model default [cite:98]
  benchmark_base: number;           // 11.5
  benchmark_optimistic: number;     // 13.0
  xirr_vs_benchmark: number | null; // vs base; positive = outperforming
  absolute_return_pct: number;
  holdings: MFHolding[];
  overlapping_pairs: OverlapPair[];
  category_breakdown: Record<string, number>;
  high_expense_funds: string[];
  rebalancing_suggestions: string[];
}

export interface FinanceAdvice {
  summary: string;
  key_actions: string[];
  risks: string[];
  disclaimer: string;
}

export interface MFXRayApiResponse {
  session_id: string;
  result: MFXRayResult;
  advice: FinanceAdvice;
  decision_log: unknown[];
}

// ─── Upload state ─────────────────────────────────────────────────────────────
export type UploadStatus =
  | "idle"
  | "selected"        // file chosen, not yet submitted
  | "uploading"
  | "success"
  | "error";

// ─── Category colour map — used identically in chart + table ─────────────────
// All values are Tailwind arbitrary-value compatible hex strings so we can use
// them in both className and inline style without importing a colour library.
export const CATEGORY_COLORS: Record<string, string> = {
  "Large Cap":       "#6366f1",   // indigo
  "Mid Cap":         "#8b5cf6",   // violet
  "Small Cap":       "#f97316",   // orange
  "Index/ETF":       "#22c55e",   // green
  "Flexi/Multi Cap": "#3b82f6",   // blue
  "Debt":            "#64748b",   // slate
  "Liquid":          "#14b8a6",   // teal
  "Hybrid":          "#f59e0b",   // amber
  "Equity":          "#a855f7",   // purple (fallback for generic equity)
};

export function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#94a3b8"; // slate-400 fallback
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const fmt = (n: number): string =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

export const fmtShort = (n: number): string => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
};

export const fmtPct = (n: number | null | undefined, decimals = 1): string =>
  n == null ? "N/A" : `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;

// Gain/loss for a single holding
export function holdingGain(h: MFHolding): number {
  return h.current_value - h.invested_amount;
}
export function holdingGainPct(h: MFHolding): number {
  if (!h.invested_amount) return 0;
  return ((h.current_value - h.invested_amount) / h.invested_amount) * 100;
}

// Annual expense drag = invested × (expense_ratio − 0.7) / 100
// 0.7% is a rough "fair" direct plan baseline
export function expenseDrag(h: MFHolding): number | null {
  if (!h.expense_ratio || h.expense_ratio <= 0.7) return null;
  return Math.round(h.invested_amount * ((h.expense_ratio - 0.7) / 100));
}

// Overlap severity colour
export function overlapSeverity(pct: number): "red" | "amber" | "yellow" {
  if (pct >= 65) return "red";
  if (pct >= 45) return "amber";
  return "yellow";
}

// Client-side validation before upload
export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  const MAX_BYTES = 10 * 1024 * 1024;
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (!ext || !["csv", "pdf"].includes(ext))
    return { ok: false, error: `Unsupported file type ".${ext}". Upload a .csv or .pdf statement.` };
  if (file.size > MAX_BYTES)
    return { ok: false, error: `File too large (${(file.size / 1e6).toFixed(1)} MB). Max 10 MB.` };
  if (file.size < 500 && ext === "pdf")
    return { ok: false, error: "File is too small to be a valid statement. Please upload a real CAMS/KFintech PDF." };

  return { ok: true };
}