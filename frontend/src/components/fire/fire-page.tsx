"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { getFIREPlan, type FIREResponse } from "@/lib/finance";
import { CheckCircle2, XCircle } from "lucide-react";

export function FIREPage() {
  const [form, setForm] = useState({
    age: "",
    monthly_income: "",
    monthly_expenses: "",
    retirement_age: "55",
    current_corpus: "",
    risk_tolerance: "moderate",
  });
  const [result, setResult] = useState<FIREResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        age: Number(form.age),
        monthly_income: Number(form.monthly_income),
        monthly_expenses: Number(form.monthly_expenses),
        retirement_age: Number(form.retirement_age),
        current_investments: { total: Number(form.current_corpus) },
        risk_tolerance: form.risk_tolerance,
      };
      const res = await getFIREPlan(payload);
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
          <h1 className="text-2xl font-bold tracking-tight">FIRE planner</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Find your Financial Independence date and the exact SIP needed to get there.
          </p>
        </div>

        {!result && !loading && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="age">Current age</Label>
                <Input id="age" name="age" type="number" placeholder="30" value={form.age} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="retirement_age">Target retirement age</Label>
                <Input id="retirement_age" name="retirement_age" type="number" placeholder="55" value={form.retirement_age} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly_income">Monthly income (₹)</Label>
                <Input id="monthly_income" name="monthly_income" type="number" placeholder="100000" value={form.monthly_income} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly_expenses">Monthly expenses (₹)</Label>
                <Input id="monthly_expenses" name="monthly_expenses" type="number" placeholder="60000" value={form.monthly_expenses} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="current_corpus">Current investments (₹)</Label>
                <Input id="current_corpus" name="current_corpus" type="number" placeholder="500000" value={form.current_corpus} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="risk_tolerance">Risk tolerance</Label>
                <select
                  id="risk_tolerance"
                  name="risk_tolerance"
                  value={form.risk_tolerance}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="conservative">Conservative (7% returns)</option>
                  <option value="moderate">Moderate (10% returns)</option>
                  <option value="aggressive">Aggressive (12% returns)</option>
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg">Calculate my FIRE date</Button>
          </form>
        )}

        {loading && <LoadingState message="Planning your financial independence..." />}
        {error && <ErrorState message={error} onRetry={reset} />}

        {result && (
          <div className="space-y-6">
            {/* FIRE status hero */}
            <div className={`rounded-xl p-6 border ${
              result.result.on_track
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
            }`}>
              <div className="flex items-start gap-4">
                {result.result.on_track
                  ? <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
                  : <XCircle className="h-8 w-8 text-amber-500 flex-shrink-0 mt-1" />}
                <div>
                  <p className="font-semibold text-lg">
                    {result.result.on_track
                      ? `You're on track — FI at age ${result.result.projected_fi_age?.toFixed(1)}`
                      : "You need to adjust your plan"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Required corpus: {fmt(result.result.fi_corpus_required)} · Corpus gap: {fmt(result.result.corpus_gap)}
                  </p>
                </div>
              </div>
            </div>

            {/* Key numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Flat SIP needed", value: fmt(result.result.required_monthly_sip) },
                { label: "Step-up SIP", value: fmt(result.result.required_stepup_sip) },
                { label: "Step-up rate", value: `${(result.result.stepup_rate * 100).toFixed(0)}% / yr` },
                { label: "Inflation-adj. expenses", value: fmt(result.result.monthly_retirement_expense) },
              ].map((m) => (
                <div key={m.label} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-base font-bold mt-1">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Goal SIPs */}
            {result.result.sip_goals.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-3">Goal-wise SIP plan</h2>
                <div className="space-y-3">
                  {result.result.sip_goals.map((g, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{g.goal_label}</p>
                        <p className="text-xs text-muted-foreground">Target: {fmt(g.target_amount)} by {g.target_year}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{fmt(g.required_monthly_sip)}/mo</p>
                        <p className="text-xs text-muted-foreground">Step-up: {fmt(g.required_stepup_sip)}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
