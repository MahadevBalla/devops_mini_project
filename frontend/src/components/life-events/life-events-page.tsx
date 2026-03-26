"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { getLifeEventPlan, type LifeEventResponse, type LifeEventType } from "@/lib/finance";
import { Gift, Landmark, Heart, Baby, Briefcase, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENTS: { type: LifeEventType; label: string; icon: React.ElementType; description: string }[] = [
  { type: "bonus", label: "Bonus", icon: Gift, description: "Annual bonus or windfall" },
  { type: "inheritance", label: "Inheritance", icon: Landmark, description: "Inherited money or assets" },
  { type: "marriage", label: "Marriage", icon: Heart, description: "Getting married" },
  { type: "new_baby", label: "New baby", icon: Baby, description: "Child birth planning" },
  { type: "job_loss", label: "Job loss", icon: Briefcase, description: "Unemployment or career change" },
  { type: "home_purchase", label: "Home purchase", icon: Home, description: "Buying property" },
];

export function LifeEventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<LifeEventType | null>(null);
  const [form, setForm] = useState({
    age: "",
    monthly_income: "",
    monthly_expenses: "",
    emergency_fund: "",
    event_amount: "",
  });
  const [result, setResult] = useState<LifeEventResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const needsAmount = ["bonus", "inheritance", "home_purchase"].includes(selectedEvent || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        age: Number(form.age),
        monthly_income: Number(form.monthly_income),
        monthly_expenses: Number(form.monthly_expenses),
        emergency_fund: Number(form.emergency_fund),
        event_type: selectedEvent,
        event_amount: needsAmount ? Number(form.event_amount) : 0,
      };
      const res = await getLifeEventPlan(payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setError(""); setSelectedEvent(null); };
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Life events</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Get tailored financial guidance for life's big moments.
          </p>
        </div>

        {!result && !loading && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Event picker */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm font-medium mb-3">Select your life event</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EVENTS.map((ev) => {
                  const Icon = ev.icon;
                  return (
                    <button
                      type="button"
                      key={ev.type}
                      onClick={() => setSelectedEvent(ev.type)}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-lg border text-left transition-colors",
                        selectedEvent === ev.type
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-accent"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 mb-2", selectedEvent === ev.type ? "text-primary" : "text-muted-foreground")} />
                      <p className="text-sm font-medium">{ev.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile fields */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <p className="text-sm font-medium">Your profile</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" name="age" type="number" placeholder="28" value={form.age} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monthly_income">Monthly income (₹)</Label>
                  <Input id="monthly_income" name="monthly_income" type="number" placeholder="85000" value={form.monthly_income} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monthly_expenses">Monthly expenses (₹)</Label>
                  <Input id="monthly_expenses" name="monthly_expenses" type="number" placeholder="50000" value={form.monthly_expenses} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergency_fund">Emergency fund (₹)</Label>
                  <Input id="emergency_fund" name="emergency_fund" type="number" placeholder="200000" value={form.emergency_fund} onChange={handleChange} required />
                </div>
                {needsAmount && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="event_amount">Event amount (₹)</Label>
                    <Input id="event_amount" name="event_amount" type="number" placeholder="150000" value={form.event_amount} onChange={handleChange} required />
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={!selectedEvent}>
              Get personalised plan
            </Button>
          </form>
        )}

        {loading && <LoadingState message="Building your life event plan..." />}
        {error && <ErrorState message={error} onRetry={reset} />}

        {result && (
          <div className="space-y-6">
            {/* Allocations */}
            {result.result.allocations.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-3">Recommended allocation</h2>
                <div className="space-y-3">
                  {result.result.allocations.map((a, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.category}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.rationale}</p>
                      </div>
                      <p className="text-sm font-bold flex-shrink-0">{fmt(a.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tax & priority actions */}
            {(result.result.tax_impact > 0 || result.result.priority_actions.length > 0) && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  {result.result.tax_impact > 0 && `Tax impact: ${fmt(result.result.tax_impact)} — `}
                  Action items
                </p>
                <ul className="space-y-1.5">
                  {result.result.priority_actions.map((a, i) => (
                    <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Insurance gaps */}
            {result.result.insurance_gaps.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-semibold mb-2">Insurance gaps to address</p>
                <ul className="space-y-1.5">
                  {result.result.insurance_gaps.map((g, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h2 className="text-base font-semibold mb-3">AI recommendations</h2>
              <AdvicePanel advice={result.advice} />
            </div>

            <Button variant="outline" onClick={reset} className="w-full">Plan another event</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
