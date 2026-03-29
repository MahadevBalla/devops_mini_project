"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HeartPulse, Flame, Receipt, CalendarHeart,
  Users2, ScanLine, Trash2, ExternalLink,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
  CheckCircle2, XCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  listScenarios, getScenario, deleteScenario,
  type ScenarioSummary, type ScenarioDetail,
} from "@/lib/portfolio";
import { ScenarioDetailDrawer } from "./scenario-detail-drawer";
import { toast } from "sonner";

// ─── Inline Toast ─────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

function ToastContainer({ toasts, onDismiss }: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto",
            "animate-in slide-in-from-bottom-2 fade-in duration-200",
            t.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/60 dark:border-green-800 dark:text-green-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-800 dark:text-red-300"
          )}
        >
          {t.type === "success"
            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            : <XCircle className="h-4 w-4 flex-shrink-0" />}
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Feature config ───────────────────────────────────────────────────────────

interface FeatureMeta {
  label: string;
  icon: React.ElementType;
  color: string;
  href: string;
  keyMetric: (s: ScenarioSummary) => string;
}

function fmtINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
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
    label: "Health Score", icon: HeartPulse,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    href: "/health-score",
    keyMetric: (s) => {
      const score = (s.result as Record<string, number>).overall_score;
      return score != null ? `Score: ${score}/100` : "—";
    },
  },
  fire: {
    label: "FIRE Planner", icon: Flame,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    href: "/fire",
    keyMetric: (s) => {
      const r = s.result as Record<string, number | null>;
      if (r.projected_fi_age != null) return `FI Age: ${r.projected_fi_age}`;
      if (r.corpus_gap != null) return `Gap: ${fmtINR(r.corpus_gap as number)}`;
      return "—";
    },
  },
  tax: {
    label: "Tax Wizard", icon: Receipt,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    href: "/tax",
    keyMetric: (s) => {
      const r = s.result as Record<string, unknown>;
      if (r.savings_by_switching != null) return `Saved: ${fmtINR(r.savings_by_switching as number)}`;
      if (r.recommended_regime != null) return `Regime: ${String(r.recommended_regime).toUpperCase()}`;
      return "—";
    },
  },
  life_event: {
    label: "Life Events", icon: CalendarHeart,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
    href: "/life-events",
    keyMetric: (s) => {
      const r = s.result as Record<string, unknown>;
      return r.event_type ? `Event: ${String(r.event_type).replace("_", " ")}` : "—";
    },
  },
  couple: {
    label: "Couple Planner", icon: Users2,
    color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    href: "/couple-planner",
    keyMetric: (s) => {
      const r = s.result as Record<string, number>;
      return r.joint_tax_saving != null ? `Tax saved: ${fmtINR(r.joint_tax_saving)}` : "—";
    },
  },
  mf: {
    label: "MF X-Ray", icon: ScanLine,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    href: "/portfolio",
    keyMetric: (s) => {
      const r = s.result as Record<string, number>;
      return r.overall_xirr != null ? `XIRR: ${(r.overall_xirr * 100).toFixed(1)}%` : "—";
    },
  },
};

const FEATURE_ORDER = ["health", "fire", "tax", "life_event", "couple", "mf"];

// ─── Single scenario card ─────────────────────────────────────────────────────

function ScenarioCard({
  scenario, onView, onDelete, isDeleting,
}: {
  scenario: ScenarioSummary;
  onView: (s: ScenarioSummary) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const meta = FEATURE_META[scenario.feature] ?? FEATURE_META.health;
  const Icon = meta.icon;

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-200",
      isDeleting && "opacity-50 scale-[0.99]"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", meta.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {scenario.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{relativeTime(scenario.created_at)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs font-medium text-primary">{meta.keyMetric(scenario)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onView(scenario)}
          disabled={isDeleting}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          title="View details"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">View</span>
        </button>
        <Link
          href={meta.href}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          title="Re-run"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Re-run</span>
        </Link>
        <button
          type="button"
          onClick={() => onDelete(scenario.id)}
          disabled={isDeleting}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-40"
          title="Delete"
        >
          {isDeleting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
            : <Trash2 className="h-3.5 w-3.5" />}
          {isDeleting && <span className="hidden sm:inline text-destructive">Deleting…</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Feature group (collapsible) ─────────────────────────────────────────────

function FeatureGroup({
  feature, scenarios, onView, onDelete, deletingId,
}: {
  feature: string;
  scenarios: ScenarioSummary[];
  onView: (s: ScenarioSummary) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const [open, setOpen] = useState(true);
  const meta = FEATURE_META[feature] ?? FEATURE_META.health;
  const Icon = meta.icon;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-1 py-1"
      >
        <div className="flex items-center gap-2">
          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", meta.color)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">{meta.label}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {scenarios.length}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-2 pl-1">
          {scenarios.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              onView={onView}
              onDelete={onDelete}
              isDeleting={deletingId === s.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
        <HeartPulse className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">No scenarios yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Run any tool — Health Score, FIRE Planner, Tax Wizard etc. — and your results will be saved here automatically.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {["health", "fire", "tax"].map((f) => {
          const m = FEATURE_META[f];
          const I = m.icon;
          return (
            <Link key={f} href={m.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <I className="h-3.5 w-3.5" /> {m.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main tab component ───────────────────────────────────────────────────────

let _toastId = 0;

export function ScenarioHistoryTab() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [drawerScene, setDrawerScene] = useState<ScenarioDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Toast helpers ────────────────────────────────────────────────────────

  function pushToast(type: Toast["type"], message: string) {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listScenarios(undefined, "scenario");
      setScenarios(
        [...data].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch {
      setError("Couldn't load scenario history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleView(summary: ScenarioSummary) {
    setLoadingDetail(true);
    try {
      const detail = await getScenario(summary.id);
      setDrawerScene(detail);
    } catch {
      setDrawerScene({ ...summary, input_data: {} });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteScenario(id);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      if (drawerScene?.id === id) setDrawerScene(null);
      toast.success("Scenario deleted successfully.");
    } catch {
      toast.error("Failed to delete scenario. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Grouping ──────────────────────────────────────────────────────────────

  const grouped = FEATURE_ORDER.reduce<Record<string, ScenarioSummary[]>>((acc, f) => {
    acc[f] = scenarios.filter((s) => s.feature === f);
    return acc;
  }, {});
  const featuresWithData = FEATURE_ORDER.filter((f) => grouped[f].length > 0);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button onClick={load}
          className="text-xs text-primary underline underline-offset-2 hover:opacity-80">
          Try again
        </button>
      </div>
    );
  }

  if (scenarios.length === 0) return <EmptyState />;

  return (
    <>
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">
          {scenarios.length} saved run{scenarios.length !== 1 ? "s" : ""} across{" "}
          {featuresWithData.length} tool{featuresWithData.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Loading detail spinner */}
      {loadingDetail && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading details…
        </div>
      )}

      {/* Feature groups */}
      <div className="space-y-6">
        {featuresWithData.map((f) => (
          <FeatureGroup
            key={f}
            feature={f}
            scenarios={grouped[f]}
            onView={handleView}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ))}
      </div>

      {/* Detail drawer */}
      {drawerScene && (
        <ScenarioDetailDrawer
          scenario={drawerScene}
          onClose={() => setDrawerScene(null)}
          onDelete={(id) => { handleDelete(id); setDrawerScene(null); }}
        />
      )}
    </>
  );
}