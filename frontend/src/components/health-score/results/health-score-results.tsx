// frontend/src/components/health-score/results/health-score-results.tsx
"use client";

import { useState } from "react";
import {
  HeartPulse, CreditCard, PieChart, Building2, Shield, Receipt,
  TrendingUp, Wallet, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ScoreRing } from "@/components/ui/score-ring";
import { cn } from "@/lib/utils";
import type { HealthScoreApiResponse, DimensionScore } from "@/lib/health-score-types";

interface Props {
  response: HealthScoreApiResponse;
  onReset: () => void;
}

const DIMENSION_META: Record<string, {
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}> = {
  "Emergency Fund":      { icon: Wallet,      colorClass: "text-blue-600",    bgClass: "bg-blue-50 dark:bg-blue-950/30"    },
  "Debt Health":         { icon: CreditCard,   colorClass: "text-green-600",   bgClass: "bg-green-50 dark:bg-green-950/30"  },
  "Diversification":     { icon: PieChart,     colorClass: "text-purple-600",  bgClass: "bg-purple-50 dark:bg-purple-950/30"},
  "Retirement Readiness":{ icon: Building2,    colorClass: "text-orange-600",  bgClass: "bg-orange-50 dark:bg-orange-950/30"},
  "Insurance Coverage":  { icon: Shield,       colorClass: "text-red-600",     bgClass: "bg-red-50 dark:bg-red-950/30"      },
  "Tax Efficiency":      { icon: Receipt,      colorClass: "text-teal-600",    bgClass: "bg-teal-50 dark:bg-teal-950/30"    },
};

const LABEL_STYLES: Record<string, string> = {
  Excellent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  Good:      "bg-green-100  text-green-800  dark:bg-green-950/40  dark:text-green-300",
  Fair:      "bg-amber-100  text-amber-800  dark:bg-amber-950/40  dark:text-amber-300",
  Poor:      "bg-red-100    text-red-800    dark:bg-red-950/40    dark:text-red-300",
};

const BAR_COLORS: Record<string, string> = {
  Excellent: "bg-emerald-500",
  Good:      "bg-green-500",
  Fair:      "bg-amber-500",
  Poor:      "bg-red-500",
};

const GRADE_TAGLINE: Record<string, { text: string; color: string }> = {
  A: { text: "Excellent financial health",     color: "text-emerald-600" },
  B: { text: "Good — room to grow",            color: "text-green-600"  },
  C: { text: "Needs attention",                color: "text-amber-600"  },
  D: { text: "At risk — act soon",             color: "text-orange-600" },
  F: { text: "Critical — immediate action",    color: "text-red-600"    },
};

function DimensionCard({ dim }: { dim: DimensionScore }) {
  const meta = DIMENSION_META[dim.name] ?? { icon: HeartPulse, colorClass: "text-primary", bgClass: "bg-primary/5" };
  const Icon = meta.icon;
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", meta.bgClass)}>
            <Icon className={cn("h-4 w-4", meta.colorClass)} />
          </div>
          <p className="text-sm font-semibold leading-tight">{dim.name}</p>
        </div>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", LABEL_STYLES[dim.label])}>
          {dim.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Score</span>
          <span className="font-semibold text-foreground">
            <AnimatedNumber value={dim.score} format={(n) => `${Math.round(n)}/100`} />
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", BAR_COLORS[dim.label])}
            style={{ width: `${dim.score}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{dim.insight}</p>
    </div>
  );
}

function AdviceSection({ advice }: { advice: HealthScoreApiResponse["advice"] }) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <p className="text-sm text-foreground leading-relaxed">{advice.summary}</p>
      </div>

      {/* Actions + Risks side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-semibold">Priority Actions</h3>
          </div>
          <ol className="space-y-2">
            {advice.key_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Risks to Watch</h3>
          </div>
          <ul className="space-y-2">
            {advice.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Collapsible disclaimer */}
      <div className="bg-muted rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setDisclaimerOpen(!disclaimerOpen)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground font-medium">Disclaimer</span>
          {disclaimerOpen
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
        </button>
        {disclaimerOpen && (
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{advice.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WhatIfBar({ dimensions }: { dimensions: DimensionScore[] }) {
  // Show top 3 dimensions that scored < 70 as quick wins
  const WEIGHTS: Record<string, number> = {
    "Emergency Fund": 20, "Debt Health": 20, "Diversification": 15,
    "Retirement Readiness": 20, "Insurance Coverage": 15, "Tax Efficiency": 10,
  };

  const quickWins = dimensions
    .filter((d) => d.score < 70)
    .map((d) => ({
      name: d.name,
      potentialGain: Math.round(((100 - d.score) / 100) * (WEIGHTS[d.name] ?? 10)),
    }))
    .sort((a, b) => b.potentialGain - a.potentialGain)
    .slice(0, 3);

  if (quickWins.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Quick wins — improve your score</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickWins.map(({ name, potentialGain }) => {
          const meta = DIMENSION_META[name];
          const Icon = meta?.icon ?? HeartPulse;
          return (
            <div
              key={name}
              className="flex items-center gap-3 p-3 bg-muted rounded-xl"
            >
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", meta?.bgClass)}>
                <Icon className={cn("h-4 w-4", meta?.colorClass)} />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight">{name}</p>
                <p className="text-xs text-green-600 font-medium">
                  +~<AnimatedNumber value={potentialGain} duration={0.6} />{" "}pts potential
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HealthScoreResults({ response, onReset }: Props) {
  const { result, advice } = response;
  const tagline = GRADE_TAGLINE[result.grade] ?? { text: "", color: "text-foreground" };

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="bg-card border border-border rounded-xl p-8">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <ScoreRing score={result.overall_score} grade={result.grade} size={160} />
          <div className="flex-1 space-y-4">
            <div>
              <p className={cn("text-base font-semibold", tagline.color)}>{tagline.text}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Based on 6 financial dimensions — updated in real time
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Monthly surplus</p>
                <p className={cn(
                  "text-lg font-bold mt-0.5",
                  result.monthly_surplus >= 0 ? "text-green-600" : "text-destructive"
                )}>
                  {result.monthly_surplus < 0 ? "-" : ""}₹
                  <AnimatedNumber
                    value={Math.abs(result.monthly_surplus)}
                    format={(n) => Math.round(n).toLocaleString("en-IN")}
                  />
                </p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Net worth</p>
                <p className={cn(
                  "text-lg font-bold mt-0.5",
                  result.total_net_worth >= 0 ? "text-foreground" : "text-destructive"
                )}>
                  {result.total_net_worth < 0 ? "-" : ""}₹
                  <AnimatedNumber
                    value={Math.abs(result.total_net_worth)}
                    format={(n) => Math.round(n).toLocaleString("en-IN")}
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 Dimensions ── */}
      <div>
        <h2 className="text-base font-semibold mb-3">Score Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.dimensions.map((d) => (
            <DimensionCard key={d.name} dim={d} />
          ))}
        </div>
      </div>

      {/* ── Quick wins ── */}
      <WhatIfBar dimensions={result.dimensions} />

      {/* ── AI Advice ── */}
      <div>
        <h2 className="text-base font-semibold mb-3">AI Money Mentor Recommendations</h2>
        <AdviceSection advice={advice} />
      </div>

      {/* ── Recalculate ── */}
      <Button variant="outline" onClick={onReset} className="w-full" size="lg">
        <RotateCcw className="h-4 w-4 mr-2" /> Recalculate with new data
      </Button>
    </div>
  );
}