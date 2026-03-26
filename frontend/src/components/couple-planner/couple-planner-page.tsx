"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { getCouplePlan, type CouplePlanResponse } from "@/lib/finance";
import { Users2 } from "lucide-react";

function PartnerForm({
  prefix,
  label,
  form,
  onChange,
}: {
  prefix: string;
  label: string;
  form: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold flex items-center gap-2">
        <Users2 className="h-4 w-4 text-primary" />
        {label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { id: "age", label: "Age", placeholder: "32" },
          { id: "monthly_gross_income", label: "Monthly income (₹)", placeholder: "80000" },
          { id: "monthly_expenses", label: "Monthly expenses (₹)", placeholder: "45000" },
        ].map((f) => (
          <div key={f.id} className="space-y-1.5">
            <Label htmlFor={`${prefix}_${f.id}`}>{f.label}</Label>
            <Input
              id={`${prefix}_${f.id}`}
              type="number"
              placeholder={f.placeholder}
              value={form[f.id] || ""}
              onChange={(e) => onChange(f.id, e.target.value)}
              required
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CouplePlannerPage() {
  const [partnerA, setPartnerA] = useState<Record<string, string>>({});
  const [partnerB, setPartnerB] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CouplePlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const toProfile = (f: Record<string, string>) => ({
        age: Number(f.age),
        monthly_gross_income: Number(f.monthly_gross_income),
        monthly_expenses: Number(f.monthly_expenses),
      });
      const res = await getCouplePlan({
        partner_a: toProfile(partnerA),
        partner_b: toProfile(partnerB),
        is_married: true,
        joint_goals: [],
      });
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
          <h1 className="text-2xl font-bold tracking-tight">Couple planner</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Joint financial optimisation — HRA, NPS, SIP split, and tax coordination.
          </p>
        </div>

        {!result && !loading && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PartnerForm prefix="a" label="Partner A" form={partnerA} onChange={(k, v) => setPartnerA((p) => ({ ...p, [k]: v }))} />
            <PartnerForm prefix="b" label="Partner B" form={partnerB} onChange={(k, v) => setPartnerB((p) => ({ ...p, [k]: v }))} />
            <Button type="submit" className="w-full" size="lg">Optimise our finances</Button>
          </form>
        )}

        {loading && <LoadingState message="Optimising your joint finances..." />}
        {error && <ErrorState message={error} onRetry={reset} />}

        {result && (
          <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Combined net worth", value: fmt(result.result.combined_net_worth) },
                { label: "Monthly surplus", value: fmt(result.result.combined_monthly_surplus) },
                { label: "Annual tax saving", value: fmt(result.result.joint_tax_saving) },
                { label: "HRA saving", value: fmt(result.result.hra_savings) },
              ].map((m) => (
                <div key={m.label} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-base font-bold mt-1">{m.value}</p>
                </div>
              ))}
            </div>

            {/* SIP split */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-3">Optimal SIP split</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Partner A</p>
                  <p className="text-xl font-bold">{fmt(result.result.partner_a_sip)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Partner B</p>
                  <p className="text-xl font-bold">{fmt(result.result.partner_b_sip)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-3">Joint recommendations</h2>
              <ul className="space-y-2">
                {result.result.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

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
