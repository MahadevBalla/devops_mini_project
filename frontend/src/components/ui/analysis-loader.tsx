"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnalysisLoaderProps {
    stages: string[];
    stageDelays?: number[];
    title?: string;
    subtitle?: string;
    footerNote?: string;
    paddingY?: string;
}

// ─── Character-shimmer for the active stage label ─────────────────────────────
function ShimmerText({ text }: { text: string }) {
    return (
        <span aria-label={text}>
            {text.split("").map((char, i) => (
                <motion.span
                    key={`${char}-${i}`}
                    className="inline-block"
                    initial={{ opacity: 0.4 }}
                    animate={{
                        opacity: [0.4, 1, 0.4],
                        y: [0, -1.5, 0],
                    }}
                    transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        repeatType: "loop",
                        delay: i * 0.04,
                        ease: "easeInOut",
                        repeatDelay: 0.6,
                    }}
                >
                    {char === " " ? "\u00A0" : char}
                </motion.span>
            ))}
        </span>
    );
}

// ─── Pulsing arc ring ─────────────────────────────────────────────────────────
function PulsingRing() {
    return (
        <div className="relative flex items-center justify-center w-20 h-20">
            {/* Outer slow-rotate arc */}
            <motion.svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 80 80"
                fill="none"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
                <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="48 178"
                    strokeLinecap="round"
                    className="text-primary/50"
                />
            </motion.svg>

            {/* Counter-rotate secondary arc */}
            <motion.svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 80 80"
                fill="none"
                animate={{ rotate: -360 }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            >
                <circle
                    cx="40"
                    cy="40"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="24 152"
                    strokeLinecap="round"
                    className="text-primary/25"
                />
            </motion.svg>

            {/* Center dot — glow pulse */}
            <motion.div
                className="w-5 h-5 rounded-full"
                style={{ background: "var(--gradient-primary)" }}
                animate={{
                    scale: [1, 1.3, 1],
                    boxShadow: [
                        "var(--shadow-glow-sm)",
                        "var(--shadow-glow)",
                        "var(--shadow-glow-sm)",
                    ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}

// ─── Main Loader ──────────────────────────────────────────────────────────────
export function AnalysisLoader({
    stages,
    stageDelays,
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
            const d = stageDelays?.[i - 1] ?? 1400;
            elapsed += d;
            timers.push(setTimeout(() => setStageIdx(i), elapsed));
        });
        return () => timers.forEach(clearTimeout);
    }, [stages, stageDelays]);

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-8",
                paddingY
            )}
        >
            {/* ── Animated ring ── */}
            <PulsingRing />

            {/* ── Active stage with shimmer text ── */}
            <div className="text-center space-y-1.5 min-h-12">
                {title && (
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                )}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stageIdx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="text-sm font-semibold text-foreground"
                        style={{ fontFamily: "var(--font-sans)" }}
                    >
                        <ShimmerText text={stages[stageIdx]} />
                    </motion.div>
                </AnimatePresence>
                {subtitle && (
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
            </div>

            {/* ── Stage tracker ── */}
            <div className="space-y-2 w-full max-w-xs">
                {stages.map((label, i) => {
                    const isDone = i < stageIdx;
                    const isActive = i === stageIdx;
                    const isPending = i > stageIdx;

                    return (
                        <motion.div
                            key={i}
                            className="flex items-center gap-3"
                            animate={{
                                opacity: isPending ? 0.3 : 1,
                                x: isActive ? 2 : 0,
                            }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* State indicator */}
                            <div className="shrink-0 h-5 w-5 flex items-center justify-center">
                                {isDone ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 30,
                                        }}
                                    >
                                        <CheckCircle2
                                            className="h-4 w-4"
                                            style={{ color: "var(--success)" }}
                                        />
                                    </motion.div>
                                ) : isActive ? (
                                    <motion.div
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: "var(--primary)" }}
                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
                                        transition={{ duration: 1.2, repeat: Infinity }}
                                    />
                                ) : (
                                    <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ background: "var(--border-strong)" }}
                                    />
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={cn(
                                    "text-xs leading-snug transition-colors duration-300",
                                    isActive && "text-foreground font-medium",
                                    isDone && "text-muted-foreground line-through decoration-border",
                                    isPending && "text-muted-foreground"
                                )}
                            >
                                {label}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Progress bar ── */}
            <div
                className="w-full max-w-xs h-1 rounded-full overflow-hidden"
                style={{ background: "var(--border)" }}
            >
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--gradient-primary)" }}
                    animate={{ width: `${((stageIdx + 1) / stages.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>

            {/* ── Counter ── */}
            <p className="text-[11px] text-muted-foreground tabular-nums -mt-4">
                {stageIdx + 1} of {stages.length}
            </p>

            {footerNote && (
                <p className="text-xs text-muted-foreground -mt-4">{footerNote}</p>
            )}
        </div>
    );
}
