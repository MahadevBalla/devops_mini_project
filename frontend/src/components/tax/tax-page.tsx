"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { getTaxAnalysis, type TaxResponse } from "@/lib/finance";
import { TrendingDown, AlertCircle } from "lucide-react";

export function TaxPage() {
  const [form, setForm] = useState({
    age: "",
    annual_income: "",
    ppf: "",
    elss: "",
    health_insurance_self: "",
    nps_contribution: "",
    home_loan_interest: "",
  });
  const [result, setResult] = useState<TaxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        age: Number(form.age),
        annual_income: Number(form.annual_income),
        tax_investments: {
          ppf: Number(form.ppf) || 0,
          elss: Number(form.elss) || 0,
        },
        health_insurance: { self_premium: Number(form.health_insurance_self) || 0 },
        nps_contribution: Number(form.nps_contribution) || 0,
        home_loan: { interest_component: Number(form.home_loan_interest) || 0 },
        regime_preference: "want_to_compare",
      };
      const res = await getTaxAnalysis(payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setError(""); };
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax wizard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Old vs New regime comparison with missing deduction detection — FY 2025-26.
          </p>
        </div>

        {!result && !loading && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" placeholder="32" value={form.age} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="annual_income">Annual income (₹)</Label>
                <Input id="annual_income" name="annual_income" type="number" placeholder="1200000" value={form.annual_income} onChange={handleChange} required />
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deductions (optional — leave blank if none)</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ppf">PPF / 80C investments (₹)</Label>
                <Input id="ppf" name="ppf" type="number" placeholder="80000" value={form.ppf} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="elss">ELSS mutual funds (₹)</Label>
                <Input id="elss" name="elss" type="number" placeholder="50000" value={form.elss} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="health_insurance_self">Health insurance premium (₹)</Label>
                <Input id="health_insurance_self" name="health_insurance_self" type="number" placeholder="15000" value={form.health_insurance_self} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nps_contribution">NPS contribution (₹)</Label>
                <Input id="nps_contribution" name="nps_contribution" type="number" placeholder="30000" value={form.nps_contribution} onChange={handleChange} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="home_loan_interest">Home loan interest (₹)</Label>
                <Input id="home_loan_interest" name="home_loan_interest" type="number" placeholder="180000" value={form.home_loan_interest} onChange={handleChange} />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">Compare regimes</Button>
          </form>
        )}

        {loading && <LoadingState message="Optimising your tax position..." />}
        {error && <ErrorState message={error} onRetry={reset} />}

        {result && (
          <div className="space-y-6">
            {/* Regime comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  label: "Old regime",
                  tax: result.result.old_regime_tax,
                  rate: result.result.effective_rate_old,
                  recommended: result.result.recommended_regime === "old",
                },
                {
                  label: "New regime",
                  tax: result.result.new_regime_tax,
                  rate: result.result.effective_rate_new,
                  recommended: result.result.recommended_regime === "new",
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className={`rounded-xl p-5 border-2 ${
                    r.recommended
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold">{r.label}</p>
                    {r.recommended && (
                      <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{fmt(r.tax)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Effective rate: {r.rate.toFixed(2)}%</p>
                </div>
              ))}
            </div>

            {/* Savings banner */}
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl">
              <TrendingDown className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                You save {fmt(result.result.savings_by_switching)} by choosing the {result.result.recommended_regime} regime.
              </p>
            </div>

            {/* Missing deductions */}
            {result.result.missing_deductions.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold">Unused deductions — {fmt(result.result.deduction_potential)} potential savings</h2>
                </div>
                <ul className="space-y-2">
                  {result.result.missing_deductions.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h2 className="text-base font-semibold mb-3">AI recommendations</h2>
              <AdvicePanel advice={result.advice} />
            </div>

            <Button variant="outline" onClick={reset} className="w-full">Recalculate</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
