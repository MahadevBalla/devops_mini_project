// frontend/src/components/mf-xray/upload-zone.tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateFile, type UploadStatus } from "@/lib/mf-xray-types";

interface Props {
  status: UploadStatus;
  error: string;
  onFile: (file: File) => void;
  onSubmit: () => void;
  onReset: () => void;
}

const HOW_TO = [
  {
    name: "CAMS",
    url: "https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement",
    steps: "Login → Statements → Consolidated Account Statement → Email / Download",
  },
  {
    name: "KFintech / MFCentral",
    url: "https://www.mfcentral.com",
    steps: "Login → My Investments → Download CAS → Select Date Range",
  },
];

export function UploadZone({ status, error, onFile, onSubmit, onReset }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");

  const handleFile = useCallback((file: File) => {
    const v = validateFile(file);
    if (!v.ok) {
      setValidationError(v.error!);
      setSelectedFile(null);
      return;
    }
    setValidationError("");
    setSelectedFile(file);
    onFile(file);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  function clearFile() {
    setSelectedFile(null);
    setValidationError("");
    if (inputRef.current) inputRef.current.value = "";
    onReset();
  }

  const displayError = validationError || error;
  const isUploading  = status === "uploading";

  return (
    <div className="space-y-5">

      {/* ── Drop zone ── */}
      {!selectedFile ? (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 min-h-[200px]",
            "border-2 border-dashed rounded-xl cursor-pointer transition-all",
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/40 bg-card"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.pdf"
            className="hidden"
            onChange={onInputChange}
          />
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center transition-all",
            dragging ? "bg-primary/10" : "bg-muted"
          )}>
            <Upload className={cn("h-7 w-7 transition-colors",
              dragging ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="text-center space-y-1 px-6">
            <p className={cn("text-sm font-semibold",
              dragging ? "text-primary" : "text-foreground")}>
              {dragging ? "Drop it here!" : "Drop your statement here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or <span className="text-primary underline underline-offset-2">click to browse</span>
            </p>
            <p className="text-[11px] text-muted-foreground pt-1">
              Accepts .csv or .pdf · Max 10 MB
            </p>
          </div>
        </div>
      ) : (
        /* ── File selected: pre-submit card ── */
        <div className="flex items-center gap-4 px-5 py-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
          <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{selectedFile.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(0)} KB
              {" · "}{selectedFile.name.split(".").pop()?.toUpperCase()}
              {" · "}Ready to analyse
            </p>
          </div>
          {!isUploading && (
            <button
              type="button"
              onClick={clearFile}
              className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Validation / API error ── */}
      {displayError && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{displayError}</p>
        </div>
      )}

      {/* ── Privacy note ── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-base">🔒</span>
        <span>
          Your statement is analysed in real-time and <strong className="text-foreground">never stored</strong> on our servers.
        </span>
      </div>

      {/* ── Submit button ── */}
      {selectedFile && (
        <Button
          size="lg"
          className="w-full gap-2"
          disabled={isUploading}
          onClick={onSubmit}
        >
          {isUploading ? (
            <>
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Analysing...
            </>
          ) : (
            <>🔬 Analyse Portfolio</>
          )}
        </Button>
      )}

      {/* ── How to get your statement ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          How to download your statement
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HOW_TO.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-muted/30 transition-all group"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-foreground">{s.name}</p>
                  <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.steps}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}