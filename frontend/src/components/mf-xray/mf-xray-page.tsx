// frontend/src/components/mf-xray/mf-xray-page.tsx
"use client";

import { useState } from "react";
import {
  RotateCcw, Microscope,
  TrendingUp, ArrowLeftRight, TrendingDown, Wrench, Download, LucideIcon
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { AnalysisLoader } from "@/components/ui/analysis-loader";
import { getMFXray } from "@/lib/finance";
import type { MFXRayApiResponse, UploadStatus } from "@/lib/mf-xray-types";

import { UploadZone } from "./upload-zone";
import { XRayHero } from "./results/xray-hero";
import { CategoryChart } from "./results/category-chart";
import { HoldingsTable } from "./results/holdings-table";
import { OverlapPairs } from "./results/overlap-pairs";
import { ExpenseAlert } from "./results/expense-alert";
import { RebalancingPlan } from "./results/rebalancing-plan";

// ─── Feature highlight tiles ──────────────────────────────────────────────────
const FEATURE_TILES: { icon: LucideIcon; label: string }[] = [
  { icon: TrendingUp, label: "XIRR vs Nifty" },
  { icon: ArrowLeftRight, label: "Overlap scan" },
  { icon: TrendingDown, label: "Expense alert" },
  { icon: Wrench, label: "Rebalancing" },
];

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
    `XIRR:            ${r.overall_xirr == null ? "N/A" : r.overall_xirr.toFixed(1) + "% p.a."}`,
    `Alpha vs Nifty:  ${r.xirr_vs_benchmark == null ? "N/A" : r.xirr_vs_benchmark.toFixed(1) + "%"}`,
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mf-xray-report.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function MFXRayPage() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MFXRayApiResponse | null>(null);

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
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => downloadReport(result)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Report
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

            <XRayHero result={result.result} />
            <CategoryChart result={result.result} />
            <HoldingsTable
              holdings={result.result.holdings}
              highExpenseFunds={result.result.high_expense_funds}
            />
            <OverlapPairs pairs={result.result.overlapping_pairs} />
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
            <AnalysisLoader
              stages={[
                "Parsing your statement...",
                "Fetching live NAV from AMFI...",
                "Computing XIRR & absolute returns...",
                "Detecting fund overlap...",
                "Generating AI insights...",
              ]}
              stageDelays={[1200, 2400, 3600, 4800]}
              icon={Microscope}
              iconStatic
              title="Analysing your portfolio"
              subtitle={selectedFile?.name ?? "statement"}
              footerNote="Takes 5–15 seconds"
              paddingY="py-14"
            />
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

            {/* Feature highlight tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FEATURE_TILES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-xl border border-border"
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
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
