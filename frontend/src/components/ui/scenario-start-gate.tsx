// frontend/src/components/ui/scenario-start-gate.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, PenLine, ArrowRight,
  User, TrendingUp, Wallet, Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getPortfolio, isProfileEmpty } from "@/lib/portfolio";
import type { UserProfile } from "@/lib/portfolio";
import { ToolHero, type ToolHeroProps } from "./tool-hero";

export type ScenarioChoice = "portfolio" | "fresh";

interface Props {
  onChoice: (choice: ScenarioChoice) => void;
  toolName: string;
  prefilledFields?: string;
  heroProps?: ToolHeroProps;   // ← NEW: optional hero config
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 bg-background rounded-lg border border-border min-w-0">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-foreground mt-0.5">{value}</span>
    </div>
  );
}

// Wraps each card with a staggered fade-up animation
function AnimatedCard({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.1 + index * 0.08, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function ScenarioStartGate({
  onChoice,
  toolName,
  prefilledFields,
  heroProps,
}: Props) {
  const [loading, setLoading]     = useState(true);
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    getPortfolio()
      .then((p) => {
        if (!isProfileEmpty(p)) {
          setProfile(p.profile as UserProfile);
          setHasProfile(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Loading your portfolio...</p>
      </div>
    );
  }

  // ── No profile yet ─────────────────────────────────────────────────────────
  if (!hasProfile) {
    return (
      <div className="space-y-5">
        {/* Hero */}
        {heroProps && <ToolHero {...heroProps} />}

        <div className="text-center space-y-1.5 pt-1">
          <h2 className="text-base font-semibold">Start a new scenario</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            You haven't set up a portfolio yet. Enter details manually, or save
            your profile once and auto-fill all tools forever.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatedCard index={0}>
            <button
              type="button"
              onClick={() => onChoice("fresh")}
              className="w-full flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <PenLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Enter manually</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fill in just what {toolName} needs
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-primary font-medium mt-auto">
                Continue{" "}
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <Link
              href="/profile"
              className="flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-border hover:border-primary/40 transition-all text-left group"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Set up portfolio</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save once, auto-fill all tools forever
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mt-auto">
                Go to profile{" "}
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </AnimatedCard>
        </div>
      </div>
    );
  }

  // ── Has profile ────────────────────────────────────────────────────────────
  const income      = profile!.monthly_gross_income;
  const expenses    = profile!.monthly_expenses;
  const totalAssets = Object.values(profile!.assets).reduce((s, v) => s + v, 0);
  const surplus     = income - expenses;

  const fmtINR = (n: number) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr`
    : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L`
    : n >= 1e3 ? `₹${(n / 1e3).toFixed(0)}K`
    : `₹${n}`;

  return (
    <div className="space-y-5">
      {/* Hero */}
      {heroProps && <ToolHero {...heroProps} />}

      <div className="text-center space-y-1">
        <h2 className="text-base font-semibold p-5">How do you want to start?</h2>
        <p className="text-xs text-muted-foreground">
          Pre-fill from your saved portfolio, or try a fresh what-if scenario
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Use portfolio */}
        <AnimatedCard index={0}>
          <button
            type="button"
            onClick={() => onChoice("portfolio")}
            className={cn(
              "w-full flex flex-col items-start gap-4 p-5 rounded-xl border-2 text-left transition-all group",
              "border-primary bg-primary/5 hover:bg-primary/10"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">Use my portfolio</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {prefilledFields || "Pre-fill income, assets, debts and more from your saved profile"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 w-full">
              {income > 0      && <StatPill label="Income/mo"  value={fmtINR(income)} />}
              {totalAssets > 0 && <StatPill label="Assets"     value={fmtINR(totalAssets)} />}
              {surplus > 0     && <StatPill label="Surplus/mo" value={fmtINR(surplus)} />}
            </div>

            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              Pre-fill and start{" "}
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </AnimatedCard>

        {/* Fresh scenario */}
        <AnimatedCard index={1}>
          <button
            type="button"
            onClick={() => onChoice("fresh")}
            className={cn(
              "w-full flex flex-col items-start gap-4 p-5 rounded-xl border-2 text-left transition-all group",
              "border-border hover:border-primary/40 bg-card"
            )}
          >
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <PenLine className="h-5 w-5 text-muted-foreground" />
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">Start fresh</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter different numbers — perfect for what-if scenarios
              </p>
            </div>

            <div className="space-y-1.5 w-full">
              {[
                { icon: TrendingUp, text: "What if I earn ₹2L/mo?" },
                { icon: Wallet,     text: "What if I had no EMIs?" },
                { icon: User,       text: "Plan for a family member" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mt-auto">
              Start blank{" "}
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </AnimatedCard>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Portfolio data outdated?{" "}
        <Link href="/profile" className="text-primary hover:underline underline-offset-2">
          Update your profile
        </Link>
      </p>
    </div>
  );
}