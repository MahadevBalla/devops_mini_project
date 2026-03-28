// frontend/src/components/ui/analysis-loader.tsx
"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnalysisLoaderProps {
    stages: string[];
    stageDelays?: number[];
    icon?: LucideIcon;
    iconStatic?: boolean;
    title?: string;
    subtitle?: string;
    footerNote?: string;
    paddingY?: string;
}

export function AnalysisLoader({
    stages,
    stageDelays,
    icon: Icon = Loader2,
    iconStatic = false,
    title,
    subtitle,
    footerNote,
    paddingY = "py-16",
}: Readonly<AnalysisLoaderProps>) {
    const [stageIdx, setStageIdx] = useState(0);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        let elapsed = 0;
        stages.forEach((_, i) => {
            if (i === 0) return;
            const d = stageDelays?.[i - 1] ?? 1200;
            elapsed += d;
            timers.push(setTimeout(() => setStageIdx(i), elapsed));
        });
        return () => timers.forEach(clearTimeout);
    }, [stages, stageDelays]);

    return (
        <div className={cn("flex flex-col items-center justify-center gap-6", paddingY)}>

            {/* ── Center icon: slow-spinning outer ring + icon ── */}
            <div className="relative flex items-center justify-center">
                {/* Slow rotating arc — feels "computing", not "pinging" */}
                <svg
                    className="absolute h-20 w-20 animate-[spin_3s_linear_infinite]"
                    viewBox="0 0 80 80"
                    fill="none"
                >
                    <circle
                        cx="40" cy="40" r="36"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="60 166"
                        strokeLinecap="round"
                        className="text-primary/40"
                    />
                </svg>
                {/* Static outer ring */}
                <div className="h-16 w-16 rounded-full border border-border/50 flex items-center justify-center bg-card">
                    <Icon
                        className={cn(
                            "h-7 w-7 text-primary",
                            !iconStatic && "animate-spin"
                        )}
                    />
                </div>
            </div>

            {/* ── Optional title block ── */}
            {(title || subtitle) && (
                <div className="text-center space-y-0.5">
                    {title && (
                        <p className="text-sm font-semibold text-foreground">{title}</p>
                    )}
                    {subtitle && (
                        <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}

            {/* ── Stage tracker ── */}
            <div className="space-y-3 w-full max-w-xs">
                {stages.map((label, i) => {
                    const isDone = i < stageIdx;
                    const isActive = i === stageIdx;
                    const isPending = i > stageIdx;
                    return (
                        <div
                            key={i}
                            className={cn(
                                "flex items-center gap-3 text-sm transition-all duration-500",
                                isPending && "opacity-30 translate-y-0.5"
                            )}
                        >
                            {/* State icon */}
                            <div className="shrink-0 h-5 w-5 flex items-center justify-center">
                                {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                ) : isActive ? (
                                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                ) : (
                                    <div className="h-3.5 w-3.5 rounded-full border border-border" />
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={cn(
                                    "text-sm leading-snug",
                                    isActive && "text-foreground font-medium",
                                    isDone && "text-muted-foreground opacity-60",
                                    isPending && "text-muted-foreground"
                                )}
                            >
                                {label}
                            </span>

                            {/* Active pulse dot — only on current stage */}
                            {isActive && (
                                <span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-primary animate-[pulse_2s_ease-in-out_infinite]" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Progress counter ── */}
            <p className="text-[11px] text-muted-foreground tabular-nums">
                {stageIdx + 1} / {stages.length}
            </p>

            {/* ── Optional footer ── */}
            {footerNote && (
                <p className="text-xs text-muted-foreground -mt-2">{footerNote}</p>
            )}
        </div>
    );
}
