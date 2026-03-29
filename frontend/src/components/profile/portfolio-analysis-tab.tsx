"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HeartPulse, Flame, Receipt, CalendarHeart,
  Users2, ScanLine, Clock, ArrowRight,
  TrendingUp, TrendingDown, Activity, ChevronRight,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { listScenarios, type ScenarioSummary } from "@/lib/portfolio";

// ─── Feature Meta ─────────────────────────────────────────────────────────────

interface FeatureMeta {
  label: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  href: string;
  renderMetric: (s: ScenarioSummary) => React.ReactNode;
}

function fmtINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const FEATURE_META: Record<string, FeatureMeta> = {
  health: {
    label: "Health Score", 
    icon: HeartPulse,
    color: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-500/10 to-transparent",
    href: "/health-score",
    renderMetric: (s) => {
      const r = s.result as Record<string, number | string>;
      const score = (r.overall_score as number) || 0;
      return (
        <div className="flex flex-col">
          <span className="text-3xl font-bold font-mono tracking-tight">{score}/100</span>
          <span className="text-sm font-medium text-muted-foreground mt-1">Overall Health Score</span>
        </div>
      );
    },
  },
  fire: {
    label: "FIRE Planner", 
    icon: Flame,
    color: "text-orange-600 dark:text-orange-400",
    gradient: "from-orange-500/10 to-transparent",
    href: "/fire",
    renderMetric: (s) => {
      const r = s.result as Record<string, number | null>;
      const age = r.projected_fi_age ?? "—";
      const gap = r.corpus_gap ? fmtINR(r.corpus_gap) : "None";
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-2xl font-semibold font-mono tracking-tight">{age}</span>
            <span className="text-sm font-medium text-muted-foreground">Projected FI Age</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold font-mono tracking-tight">{gap}</span>
            <span className="text-sm font-medium text-muted-foreground">Corpus Gap</span>
          </div>
        </div>
      );
    },
  },
  tax: {
    label: "Tax Wizard", 
    icon: Receipt,
    color: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500/10 to-transparent",
    href: "/tax",
    renderMetric: (s) => {
      const r = s.result as Record<string, unknown>;
      const savings = r.savings_by_switching as number;
      const regime = String(r.recommended_regime).toUpperCase();
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-2xl font-semibold font-mono tracking-tight">{regime}</span>
            <span className="text-sm font-medium text-muted-foreground">Recommended</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {savings > 0 ? `+${fmtINR(savings)}` : "None"}
            </span>
            <span className="text-sm font-medium text-muted-foreground">Switch Savings</span>
          </div>
        </div>
      );
    },
  },
  mf: {
    label: "MF X-Ray", 
    icon: ScanLine,
    color: "text-teal-600 dark:text-teal-400",
    gradient: "from-teal-500/10 to-transparent",
    href: "/portfolio",
    renderMetric: (s) => {
      const r = s.result as Record<string, number>;
      const xirr = r.overall_xirr != null ? (r.overall_xirr * 100).toFixed(1) + "%" : "—";
      const val = r.total_current_value ? fmtINR(r.total_current_value) : "—";
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-2xl font-semibold font-mono tracking-tight">{val}</span>
            <span className="text-sm font-medium text-muted-foreground">Current Value</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold font-mono tracking-tight">{xirr}</span>
            <span className="text-sm font-medium text-muted-foreground">Overall XIRR</span>
          </div>
        </div>
      );
    },
  },
  couple: {
    label: "Couple Planner", 
    icon: Users2,
    color: "text-green-600 dark:text-green-400",
    gradient: "from-green-500/10 to-transparent",
    href: "/couple-planner",
    renderMetric: (s) => {
      const r = s.result as Record<string, number>;
      const savings = r.joint_tax_saving;
      return (
        <div className="flex flex-col">
          <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {savings != null ? `+${fmtINR(savings)}` : "—"}
          </span>
          <span className="text-sm font-medium text-muted-foreground">Joint Tax Savings</span>
        </div>
      );
    },
  },
  life_event: {
    label: "Life Events", 
    icon: CalendarHeart,
    color: "text-pink-600 dark:text-pink-400",
    gradient: "from-pink-500/10 to-transparent",
    href: "/life-events",
    renderMetric: (s) => {
      const r = s.result as Record<string, unknown>;
      const event = r.event_type ? String(r.event_type).replace("_", " ") : "—";
      const val = r.event_amount as number;
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-semibold capitalize truncate pr-4">{event}</span>
            <span className="text-sm font-medium text-muted-foreground">Event Type</span>
          </div>
          {val ? (
            <div className="flex flex-col">
              <span className="text-xl font-semibold font-mono tracking-tight">{fmtINR(val)}</span>
              <span className="text-sm font-medium text-muted-foreground">Amount</span>
            </div>
          ) : <div/>}
        </div>
      );
    },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PortfolioAnalysisTab() {
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listScenarios(undefined, "portfolio");
      setScenarios(
        [...data].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch {
      setError("Couldn't load portfolio analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && scenarios.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        <p>Loading your portfolio analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-red-100 dark:border-red-900/30 rounded-2xl bg-red-50/50 dark:bg-red-950/10 mb-8">
        <Activity className="h-10 w-10 text-red-400 mb-4 opacity-50" />
        <p className="text-red-600 dark:text-red-400 text-center font-medium mb-4 max-w-[280px]">
          {error}
        </p>
        <button
          onClick={load}
          className="text-sm bg-background border shadow-sm px-4 py-2 flex items-center gap-2 rounded-full hover:bg-muted font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Get only the latest run for each feature
  const latestByFeature = new Map<string, ScenarioSummary>();
  const historyByFeature = new Map<string, number>();

  scenarios.forEach(s => {
    if (!latestByFeature.has(s.feature)) {
      latestByFeature.set(s.feature, s);
    }
    historyByFeature.set(s.feature, (historyByFeature.get(s.feature) || 0) + 1);
  });

  const cards = Array.from(latestByFeature.values());

  if (cards.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/20">
        <Activity className="h-16 w-16 text-muted-foreground/30 mb-6" />
        <h3 className="text-xl font-semibold mb-2">No portfolio analysis yet</h3>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Run our tools using your actual profile to see your consolidated financial picture build up here.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl px-6">
          {Object.entries(FEATURE_META).slice(0, 3).map(([key, meta]) => (
            <Link
              key={key}
              href={meta.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors shadow-sm text-center"
            >
              <meta.icon className={cn("h-6 w-6", meta.color)} />
              <span className="text-sm font-medium">{meta.label}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((s) => {
          const meta = FEATURE_META[s.feature] || {
            label: s.feature, icon: Activity, color: "text-primary", gradient: "from-primary/10", href: "#", renderMetric: () => <span/>
          };
          const Icon = meta.icon;
          const runCount = historyByFeature.get(s.feature) || 1;

          return (
            <div 
              key={s.id} 
              className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
                meta.gradient
              )} />
              
              <div className="p-6 relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl bg-background shadow-sm border", meta.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{meta.label}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Clock className="h-3 w-3" />
                        <span>{relativeTime(s.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Link 
                    href={meta.href}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={`Re-run ${meta.label}`}
                  >
                    <ArrowRight className="h-4 w-4 -rotate-45" />
                  </Link>
                </div>

                <div className="py-4 border-y border-border/50">
                  {meta.renderMetric(s)}
                </div>

                <div className="flex justify-between items-center mt-5">
                  <span className="text-xs font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-muted">
                    {runCount} {runCount === 1 ? 'run' : 'runs'}
                  </span>
                  
                  <Link
                    href={`/chat?context=${s.session_type}&id=${s.id}`}
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    View details <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
