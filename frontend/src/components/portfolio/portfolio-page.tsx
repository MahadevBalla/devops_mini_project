"use client";

import { useState, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { AdvicePanel } from "@/components/ui/advice-panel";
import { getMFXray, type MFXrayResponse } from "@/lib/finance";
import { Upload, FileText, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortfolioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<MFXrayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { setError("File must be under 10 MB."); return; }
    setFile(f);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await getMFXray(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setFile(null); setError(""); };
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MF X-Ray</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload your CAMS / KFintech statement — get XIRR, overlap detection, and rebalancing advice.
          </p>
        </div>

        {!result && !loading && (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50"
              )}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop your statement here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports CAMS CSV and KFintech PDF · Max 10 MB</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button onClick={handleSubmit} size="sm">Analyse</Button>
              </div>
            )}

            {error && <ErrorState message={error} onRetry={reset} />}

            <div className="p-4 bg-muted rounded-xl">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">How to get your statement:</span> Login to CAMS → Mailback → Consolidated Account Statement. Your data stays in your session only.
              </p>
            </div>
          </div>
        )}

        {loading && <LoadingState message="Analysing your portfolio..." />}

        {result && (
          <div className="space-y-6">
            {/* Portfolio summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total invested", value: fmt(result.result.total_invested) },
                { label: "Current value", value: fmt(result.result.total_current_value) },
                { label: "XIRR", value: pct(result.result.overall_xirr) },
                { label: "Absolute return", value: pct(result.result.absolute_return_pct) },
              ].map((m) => (
                <div key={m.label} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={cn(
                    "text-base font-bold mt-1",
                    (m.label === "XIRR" || m.label === "Absolute return") &&
                    result.result.overall_xirr > 0 ? "text-green-600" : ""
                  )}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Holdings table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">Holdings ({result.result.holdings.length} funds)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ tableLayout: "fixed", minWidth: 500 }}>
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground w-[40%]">Fund</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground w-[20%]">Invested</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground w-[20%]">Current</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground w-[20%]">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.result.holdings.map((h, i) => {
                      const gain = h.current_value - h.invested_amount;
                      return (
                        <tr key={i} className="hover:bg-accent/50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-medium truncate" title={h.scheme_name}>{h.scheme_name}</p>
                            {h.expense_ratio !== undefined && (
                              <p className={cn("text-xs", h.expense_ratio > 1 ? "text-amber-600" : "text-muted-foreground")}>
                                TER: {h.expense_ratio.toFixed(2)}%{h.expense_ratio > 1 ? " ⚠" : ""}
                              </p>
                            )}
                          </td>
                          <td className="text-right px-4 py-3 text-muted-foreground">{fmt(h.invested_amount)}</td>
                          <td className="text-right px-4 py-3">
                            <p>{fmt(h.current_value)}</p>
                            <p className={cn("text-xs", gain >= 0 ? "text-green-600" : "text-red-500")}>
                              {gain >= 0 ? (
                                <TrendingUp className="inline h-3 w-3 mr-0.5" />
                              ) : (
                                <TrendingDown className="inline h-3 w-3 mr-0.5" />
                              )}
                              {fmt(Math.abs(gain))}
                            </p>
                          </td>
                          <td className="text-right px-5 py-3">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{h.category}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Overlap warnings */}
            {result.result.overlapping_pairs.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Fund overlap detected</h2>
                </div>
                {result.result.overlapping_pairs.map((o, i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {o.fund_a.split(" ").slice(0, 3).join(" ")} ↔ {o.fund_b.split(" ").slice(0, 3).join(" ")} — {o.overlap_percent.toFixed(0)}% overlap
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Rebalancing */}
            {result.result.rebalancing_suggestions.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="text-sm font-semibold mb-3">Rebalancing suggestions</h2>
                <ul className="space-y-2">
                  {result.result.rebalancing_suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h2 className="text-base font-semibold mb-3">AI recommendations</h2>
              <AdvicePanel advice={result.advice} />
            </div>

            <Button variant="outline" onClick={reset} className="w-full">Upload another statement</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
