"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { ScoreRing } from "@/components/ui/score-ring";
import { getHealthScore, type HealthScoreResponse } from "@/lib/finance";

const DIMENSIONS_COLOR: Record<string, string> = {
  Good: "bg-green-100 text-green-800",
  Fair: "bg-amber-100 text-amber-800",
  Poor: "bg-red-100 text-red-800",
  Excellent: "bg-emerald-100 text-emerald-800",
};

export function HealthScorePage() {
  const [form, setForm] = useState({
    age: "",
    city: "",
    monthly_income: "",
    monthly_expenses: "",
    emergency_fund: "",
  });
  const [result, setResult] = useState<HealthScoreResponse | null>(null);
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
        city: form.city,
        monthly_income: Number(form.monthly_income),
        monthly_expenses: Number(form.monthly_expenses),
        emergency_fund: Number(form.emergency_fund),
      };
      const res = await getHealthScore(payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setError(""); };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial health score</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Get a comprehensive 0–100 score across 6 financial dimensions in seconds.
          </p>
        </div>

        {!result && !loading && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" placeholder="28" value={form.age} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="Mumbai" value={form.city} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly_income">Monthly income (₹)</Label>
                <Input id="monthly_income" name="monthly_income" type="number" placeholder="75000" value={form.monthly_income} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly_expenses">Monthly expenses (₹)</Label>
                <Input id="monthly_expenses" name="monthly_expenses" type="number" placeholder="45000" value={form.monthly_expenses} onChange={handleChange} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="emergency_fund">Emergency fund (₹)</Label>
                <Input id="emergency_fund" name="emergency_fund" type="number" placeholder="150000" value={form.emergency_fund} onChange={handleChange} required />
                <p className="text-xs text-muted-foreground">You can also include investments, loans and insurance — our AI handles messy data.</p>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg">Calculate my score</Button>
          </form>
        )}

        {loading && <LoadingState message="Scoring your financial health..." />}
        {error && <ErrorState message={error} onRetry={reset} />}

        {result && (
          <div className="space-y-6">
            {/* Score hero */}
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col sm:flex-row items-center gap-8">
              <ScoreRing score={result.result.overall_score} grade={result.result.grade} />
              <div className="space-y-3 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Monthly surplus</p>
                    <p className="text-lg font-bold">₹{result.result.monthly_surplus.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Net worth</p>
                    <p className="text-lg font-bold">₹{result.result.total_net_worth.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 dimensions */}
            <div>
              <h2 className="text-base font-semibold mb-3">Score breakdown</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.result.dimensions.map((d) => (
                  <div key={d.name} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{d.name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIMENSIONS_COLOR[d.label] || "bg-muted text-muted-foreground"}`}>
                        {d.label}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{d.insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Advice */}
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
