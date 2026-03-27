// frontend/src/components/mf-xray/mf-xray-page.tsx
"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { AppShell }    from "@/components/layout/app-shell";
import { Button }      from "@/components/ui/button";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { getMFXray }   from "@/lib/finance";
import type { MFXRayApiResponse, UploadStatus } from "@/lib/mf-xray-types";
import { cn } from "@/lib/utils";

import { UploadZone }      from "./upload-zone";
import { XRayHero }        from "./results/xray-hero";
import { CategoryChart }   from "./results/category-chart";
import { HoldingsTable }   from "./results/holdings-table";
import { OverlapPairs }    from "./results/overlap-pairs";
import { ExpenseAlert }    from "./results/expense-alert";
import { RebalancingPlan } from "./results/rebalancing-plan";

// ─── Loading overlay ──────────────────────────────────────────────────────────
const STAGES = [
  "Parsing your statement...",
  "Fetching live NAV from AMFI...",
  "Computing XIRR & absolute returns...",
  "Detecting fund overlap...",
  "Generating AI insights...",
];

function AnalysingOverlay({ filename }: { filename: string }) {
  const [stageIdx, setStageIdx] = useState(0);

  useState(() => {
    const timers = STAGES.map((_, i) =>
      i > 0 ? setTimeout(() => setStageIdx(i), i * 1200) : null
    ).filter(Boolean);
    return () => timers.forEach((t) => t && clearTimeout(t));
  });

  return (
    <div className="flex flex-col items-center justify-center py-14 gap-6 px-4">
      {/* Pulsing icon */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-primary/20 animate-ping absolute" />
        <div className="h-16 w-16 rounded-full border-2 border-primary/30 flex items-center justify-center relative bg-card">
          <span className="text-2xl">🔬</span>
        </div>
      </div>

      {/* File name */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">Analysing your portfolio</p>
        <p className="text-xs text-muted-foreground truncate max-w-[240px]">{filename}</p>
      </div>

      {/* Stage tracker */}
      <div className="w-full max-w-xs space-y-2.5">
        {STAGES.map((label, i) => (
          <div key={i} className={cn("flex items-center gap-2.5 text-sm",
            i > stageIdx && "opacity-30")}>
            {i < stageIdx
              ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              : i === stageIdx
              ? <Loader2  className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
              : <div className="h-4 w-4 rounded-full border border-border flex-shrink-0" />
            }
            <span className={cn(
              i === stageIdx ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Takes 5–15 seconds</p>
    </div>
  );
}

// ─── Download report (client-side text dump) ─────────────────────────────────
function downloadReport(data: MFXRayApiResponse) {
  const r = data.result;
  const lines: string[] = [
    "===  MF PORTFOLIO X-RAY REPORT  ===",
    `Session: ${data.session_id}`,
    "",
    "SUMMARY",
    `Total Invested:  ₹${r.total_invested.toLocaleString("en-IN")}`,
    `Current Value:   ₹${r.total_current_value.toLocaleString("en-IN")}`,
    `Absolute Return: ${r.absolute_return_pct.toFixed(1)}%`,
    `XIRR:            ${r.overall_xirr != null ? r.overall_xirr.toFixed(1) + "% p.a." : "N/A"}`,
    `Alpha vs Nifty:  ${r.xirr_vs_benchmark != null ? r.xirr_vs_benchmark.toFixed(1) + "%" : "N/A"}`,
    "",
    "HOLDINGS",
    ...r.holdings.map((h) =>
      `  ${h.scheme_name}  |  ${h.category}  |  Invested: ₹${h.invested_amount.toLocaleString("en-IN")}  |  Current: ₹${h.current_value.toLocaleString("en-IN")}`
    ),
    "",
    "REBALANCING SUGGESTIONS",
    ...r.rebalancing_suggestions.map((s, i) => `  ${i + 1}. ${s}`),
    "",
    "AI SUMMARY",
    data.advice.summary,
    "",
    "KEY ACTIONS",
    ...data.advice.key_actions.map((a, i) => `  ${i + 1}. ${a}`),
    "",
    "DISCLAIMER",
    data.advice.disclaimer,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "mf-xray-report.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function MFXRayPage() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error,        setError        ] = useState("");
  const [result,       setResult       ] = useState<MFXRayApiResponse | null>(null);

  function handleFile(file: File) {
    setSelectedFile(file);
    setError("");
    setUploadStatus("selected");
  }

  function handleReset() {
    setSelectedFile(null);
    setError("");
    setUploadStatus("idle");
  }

  async function handleSubmit() {
    if (!selectedFile) return;
    setUploadStatus("uploading");
    setError("");
    try {
      const res = await getMFXray(selectedFile) as unknown as MFXRayApiResponse;
      setResult(res);
      setUploadStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploadStatus("error");
    }
  }

  function resetAll() {
    setResult(null);
    setSelectedFile(null);
    setError("");
    setUploadStatus("idle");
  }

  const isUploading = uploadStatus === "uploading";

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl mx-auto">

        {/* ── Results ── */}
        {result && (
          <div className="space-y-5">
            {/* Page header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Portfolio X-Ray</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {result.result.holdings.length} funds · Full analysis
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => downloadReport(result)}
                >
                  ⬇ Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={resetAll}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  New
                </Button>
              </div>
            </div>

            <XRayHero     result={result.result} />
            <CategoryChart result={result.result} />
            <HoldingsTable
              holdings={result.result.holdings}
              highExpenseFunds={result.result.high_expense_funds}
            />
            <OverlapPairs  pairs={result.result.overlapping_pairs} />
            <ExpenseAlert
              highExpenseFunds={result.result.high_expense_funds}
              holdings={result.result.holdings}
            />
            <RebalancingPlan suggestions={result.result.rebalancing_suggestions} />

            <div>
              <h2 className="text-base font-semibold mb-3">AI Insights</h2>
              <AdvicePanel advice={result.advice} />
            </div>

            <Button variant="outline" onClick={resetAll} className="w-full" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Analyse Another Portfolio
            </Button>
          </div>
        )}

        {/* ── Loading ── */}
        {isUploading && !result && (
          <div className="bg-card border border-border rounded-xl">
            <AnalysingOverlay filename={selectedFile?.name ?? "statement"} />
          </div>
        )}

        {/* ── Upload form ── */}
        {!result && !isUploading && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MF Portfolio X-Ray</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Upload your CAMS or KFintech consolidated statement for instant XIRR,
                overlap detection &amp; rebalancing advice.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: "📈", label: "XIRR vs Nifty" },
                { icon: "🔄", label: "Overlap scan"  },
                { icon: "💸", label: "Expense alert" },
                { icon: "🔧", label: "Rebalancing"   },
              ].map(({ icon, label }) => (
                <div key={label}
                  className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-xl border border-border">
                  <span className="text-base">{icon}</span>
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <UploadZone
                status={uploadStatus}
                error={error}
                onFile={handleFile}
                onSubmit={handleSubmit}
                onReset={handleReset}
              />
            </div>
          </>
        )}

      </div>
    </AppShell>
  );
}