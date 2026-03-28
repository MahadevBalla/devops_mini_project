// src/app/page.tsx
"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import NumberFlow from "@number-flow/react";
import { Button } from "@/components/ui/button";
import { TerminalDemo } from "@/components/ui/terminal-demo";
import { WobbleCard } from "@/components/ui/wobble-card";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { MovingBorderButton } from "@/components/ui/moving-border";
import {
  ArrowRight,
  Sparkles,
  Calculator,
  Flame,
  ScanLine,
  Users,
  CalendarClock,
  MessageCircle,
  Upload,
  Cpu,
  BarChart3,
  Lightbulb,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { ToggleTheme } from "@/components/ui/toggle-theme";

// ─── STAT COUNTER ─────────────────────────────────────────────────────────────
function StatCounter({
  value,
  prefix = "",
  suffix = "",
  label,
  sublabel,
  icon: Icon,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="text-center group relative p-10">
      {/* glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "var(--primary-subtle)" }}
      />
      {Icon && (
        <div
          className="mx-auto mb-3 size-10 rounded-xl flex items-center justify-center"
          style={{
            background: "var(--primary-subtle)",
            border: "1px solid var(--primary-muted)",
          }}
        >
          <Icon className="h-5 w-5 text-primary" />
        </div>
      )}
      <div
        className="text-3xl sm:text-4xl font-bold tabular-nums flex items-baseline justify-center gap-0.5"
        style={{ letterSpacing: "-0.04em" }}
      >
        {prefix && (
          <span className="text-primary text-2xl sm:text-3xl">{prefix}</span>
        )}
        {inView ? (
          <NumberFlow
            value={value}
            format={{ notation: "compact", maximumFractionDigits: 1 }}
            transformTiming={{ duration: 1400, easing: "ease-out" }}
            className="text-foreground"
          />
        ) : (
          <span className="text-foreground">0</span>
        )}
        {suffix && (
          <span className="text-primary text-xl sm:text-2xl">{suffix}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground mt-1">{label}</p>
      {sublabel && (
        <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

// ─── WOBBLE CARD MINI VISUALS ─────────────────────────────────────────────────
function TaxVisual() {
  return (
    <div
      className="mt-6 flex flex-col gap-3 p-4 rounded-xl"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="flex items-center justify-between text-[11px] font-mono"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>Old Regime</span>
        <span
          className="font-bold"
          style={{ color: "var(--success)" }}
        >
          Save ₹47,200 →
        </span>
        <span>New Regime</span>
      </div>
      <div className="flex gap-1.5 items-end h-28">
        {[65, 55, 48, 40, 32].map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t"
            style={{
              background:
                i < 3
                  ? "var(--primary-muted)"
                  : "var(--primary)",
              opacity: i < 3 ? 0.5 : 1,
            }}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease: "easeOut" }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px]">
        <span style={{ color: "var(--muted-foreground)" }}>₹1.84L tax</span>
        <span className="font-semibold" style={{ color: "var(--success)" }}>
          ₹1.37L tax ✓
        </span>
      </div>
    </div>
  );
}

function FIREVisual() {
  return (
    <div
      className="mt-6 space-y-3 p-4 rounded-xl"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="text-4xl font-bold"
          style={{
            color: "var(--primary)",
            letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          48
        </div>
        <div className="flex-1">
          <div
            className="flex justify-between text-[11px] mb-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>Corpus</span>
            <span className="text-primary font-semibold">67%</span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--gradient-primary)" }}
              initial={{ width: "0%" }}
              whileInView={{ width: "67%" }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {[
          { v: "₹28K", l: "SIP/mo" },
          { v: "18 yrs", l: "To FIRE" },
          { v: "12.5%", l: "CAGR" },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-lg py-2"
            style={{
              background: "var(--primary-subtle)",
              border: "1px solid var(--primary-muted)",
            }}
          >
            <div
              className="text-xs font-bold"
              style={{ color: "var(--primary)" }}
            >
              {s.v}
            </div>
            <div
              className="text-[9px] mt-0.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function XRayVisual() {
  return (
    <div
      className="mt-6 p-4 rounded-xl space-y-2.5"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex justify-between text-[11px]">
        <span style={{ color: "var(--muted-foreground)" }}>Overlap detected</span>
        <span className="font-bold" style={{ color: "var(--destructive)" }}>
          ⚠ 22%
        </span>
      </div>
      {[
        { label: "XIRR", val: "14.2%", color: "var(--primary)", w: "70%" },
        { label: "Exp ratio", val: "0.89%", color: "var(--destructive)", w: "30%" },
      ].map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span
            className="text-[10px] w-16 shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          >
            {r.label}
          </span>
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: r.color }}
              initial={{ width: 0 }}
              whileInView={{ width: r.w }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span
            className="text-[10px] font-semibold w-10 text-right shrink-0"
            style={{ color: r.color }}
          >
            {r.val}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChatVisual() {
  const msgs = [
    { role: "user", msg: "How close am I to FIRE?" },
    { role: "ai", msg: "At ₹42L you're 67% there — on track for 48 ✓" },
    { role: "user", msg: "Should I switch tax regime?" },
    { role: "ai", msg: "New Regime saves ₹47,200. Switch recommended." },
  ];
  return (
    <div
      className="mt-6 p-4 rounded-xl space-y-2"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {msgs.map((m, i) => (
        <motion.div
          key={i}
          className={`flex text-[11px] ${m.role === "user" ? "justify-end" : "justify-start"}`}
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15 }}
        >
          <div
            className="px-2.5 py-1.5 rounded-xl max-w-[88%] leading-relaxed"
            style={
              m.role === "user"
                ? {
                  background: "var(--primary-subtle)",
                  color: "var(--primary)",
                  border: "1px solid var(--primary-muted)",
                }
                : {
                  background: "var(--surface-3)",
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                }
            }
          >
            {m.msg}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── STICKY SCROLL STEPS ──────────────────────────────────────────────────────
const STICKY_STEPS = [
  {
    title: "Upload your data",
    description:
      "Drop your CAMS statement, Form 16, or fill in a few numbers. No bank login, no linking, no risk. Your data stays yours.",
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-5 p-6">
        <div
          className="relative size-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "var(--primary-subtle)",
            border: "1px solid var(--primary-muted)",
          }}
        >
          <Upload className="h-8 w-8 text-primary" />
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ border: "1.5px solid var(--primary)" }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
          />
        </div>
        <div className="text-center space-y-0.5">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            CAMS statement
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            PDF · 342 KB · uploaded
          </p>
        </div>
        <div
          className="w-full max-w-[11rem] rounded-full h-1.5 overflow-hidden"
          style={{ background: "var(--border)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--gradient-primary)" }}
            initial={{ width: "0%" }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
        </div>
      </div>
    ),
  },
  {
    title: "AI processes in seconds",
    description:
      "Our model runs XIRR calculations, tax regime comparisons, FIRE projections, and overlap analysis simultaneously — not rules, actual inference.",
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div
          className="relative size-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "var(--primary-subtle)",
            border: "1px solid var(--primary-muted)",
          }}
        >
          <Cpu className="h-8 w-8 text-primary" />
          <motion.div
            className="absolute -inset-3 rounded-3xl"
            style={{ border: "1px solid var(--primary-muted)" }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5 w-full max-w-[12.5rem] text-[11px]">
          {["Tax analysis", "FIRE projection", "Overlap scan", "XIRR calc"].map(
            (t, i) => (
              <motion.div
                key={t}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <span
                  className="size-1.5 rounded-full shrink-0"
                  style={{ background: "var(--primary)" }}
                />
                <span style={{ color: "var(--muted-foreground)" }}>{t}</span>
              </motion.div>
            )
          )}
        </div>
      </div>
    ),
  },
  {
    title: "Insights appear instantly",
    description:
      "Not a PDF you'll never read. Live charts, animated numbers, regime comparisons — everything at a glance.",
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div
          className="relative size-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "var(--success-subtle)",
            border: "1px solid oklch(0.60 0.21 145 / 0.25)",
          }}
        >
          <BarChart3 className="h-8 w-8" style={{ color: "var(--success)" }} />
        </div>
        <div className="w-full max-w-[12.5rem] space-y-1.5">
          {[
            { label: "Tax saved", val: "₹47,200", color: "var(--success)" },
            { label: "XIRR", val: "14.2%", color: "var(--primary)" },
            { label: "FIRE gap", val: "₹1.68Cr", color: "var(--warning)" },
          ].map((r, i) => (
            <div
              key={r.label}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="size-1.5 rounded-full shrink-0"
                style={{ background: r.color }}
              />
              <span
                className="text-[11px] flex-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                {r.label}
              </span>
              <motion.span
                className="text-[11px] font-semibold"
                style={{ color: r.color }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.15 }}
              >
                {r.val}
              </motion.span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Your plan, generated",
    description:
      "Actionable next steps ranked by impact. Switch regime, increase SIP by ₹3K, rebalance two overlapping funds. No jargon, just tasks.",
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div
          className="relative size-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "var(--primary-subtle)",
            border: "1px solid var(--primary-muted)",
          }}
        >
          <Lightbulb className="h-8 w-8 text-primary" />
        </div>
        <div className="w-full max-w-[14rem] space-y-1.5">
          {[
            "Switch to New Regime → save ₹47,200",
            "Increase SIP ₹3K/mo → retire 2 yrs earlier",
            "Exit Axis Bluechip — 22% overlap",
          ].map((action, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-1.5 text-[10px] rounded-lg px-2.5 py-1.5"
              style={{
                color: "var(--muted-foreground)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
              initial={{ opacity: 0, y: 5 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.18 }}
            >
              <span
                className="font-bold shrink-0 mt-px"
                style={{ color: "var(--success)" }}
              >
                {i + 1}.
              </span>
              {action}
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-50 glass"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg group"
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-105"
              style={{
                background: "var(--primary-subtle)",
                border: "1px solid var(--primary-muted)",
                boxShadow: "0 0 0 0 var(--primary-glow)",
                transition: "box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "var(--shadow-glow-sm)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 0 0 0 var(--primary-glow)";
              }}
            >
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
            <span className="text-foreground">Money Mentor</span>
          </Link>

          <div className="flex gap-2">
            <Link href="/signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="rounded-lg"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  boxShadow: "var(--shadow-glow-sm)",
                }}
              >
                Get Started
              </Button>
            </Link>
            <ToggleTheme />
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <HeroHighlight
        containerClassName="min-h-[92vh] !bg-background relative"
        className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {/* Layered ambient background */}
        <div className="absolute inset-0 dot-grid-fine pointer-events-none" />
        <div className="absolute inset-x-0 -top-24 h-96 hero-glow pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 75% 50%, var(--primary-subtle) 0%, transparent 70%)",
          }}
        />

        <div className="relative w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20 lg:py-0 min-h-[92vh]">
          {/* Copy */}
          <motion.div
            className="text-center lg:text-left space-y-8"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Eyebrow badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold badge-primary"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Sparkles className="h-3 w-3" />
              AI-Powered · Built for India
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight"
              style={{ lineHeight: 1.08, letterSpacing: "-0.03em" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Save{" "}
              <Highlight className="text-foreground whitespace-nowrap">
                ₹47,200 in taxes.
              </Highlight>
              <br />
              Retire by{" "}
              <span className="text-gradient">48.</span>
            </motion.h1>

            <motion.p
              className="text-lg max-w-md mx-auto lg:mx-0 leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.55 }}
            >
              AI that analyses your taxes, FIRE path, and portfolio in seconds —
              no CA, no ₹25,000 fee, no jargon.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex gap-3 justify-center lg:justify-start flex-wrap"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5 }}
            >
              <Link href="/tax">
                <MovingBorderButton
                  duration={3200}
                  borderRadius="1.5rem"
                  containerClassName="h-12"
                  borderClassName="bg-[radial-gradient(var(--primary)_40%,transparent_60%)]"
                  className="px-6 text-sm font-semibold text-foreground gap-2"
                >
                  Find my tax savings
                  <ArrowRight className="h-4 w-4" />
                </MovingBorderButton>
              </Link>
              <Link href="/fire">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl gap-2"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  Calculate my FIRE
                  <Flame className="h-4 w-4 text-primary" />
                </Button>
              </Link>
            </motion.div>

            <motion.p
              className="text-[12px] flex items-center gap-2 justify-center lg:justify-start"
              style={{ color: "var(--muted-foreground)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <span
                className="size-1.5 rounded-full inline-block"
                style={{ background: "var(--success)" }}
              />
              Free forever · No credit card required
            </motion.p>
          </motion.div>

          {/* Terminal — floats slightly */}
          <motion.div
            className="w-full float"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <TerminalDemo />
          </motion.div>
        </div>
      </HeroHighlight>

      {/* ── STATS BAR ── */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-3 gap-8 sm:gap-10">
          <StatCounter
            value={47200}
            prefix="₹"
            label="Avg tax savings"
            sublabel="per user on first run"
            icon={Calculator}
          />
          <StatCounter
            value={48}
            suffix=" yrs"
            label="Avg FIRE age"
            sublabel="for on-track users"
            icon={TrendingUp}
          />
          <StatCounter
            value={14.2}
            suffix="%"
            label="Avg portfolio XIRR"
            sublabel="vs 11% benchmark"
            icon={BarChart3}
          />
        </div>
      </section>

      {/* ── WOBBLE FEATURES ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
        <motion.div
          className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-eyebrow">Six tools. One platform.</p>
          <h2
            className="text-3xl sm:text-4xl font-bold"
            style={{ letterSpacing: "-0.025em" }}
          >
            Everything your CA should have told you
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
            Designed for Indian investors who want clarity, not jargon.
          </p>
        </motion.div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Tax Wizard — wide */}
          <WobbleCard
            containerClassName="col-span-1 lg:col-span-2 min-h-[290px] bg-card"
          >
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--success-subtle)" }}
                >
                  <Calculator className="h-4 w-4" style={{ color: "var(--success)" }} />
                </div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--success)" }}
                >
                  Tax Wizard
                </span>
              </div>
              <h3
                className="text-2xl font-bold mb-2"
                style={{ letterSpacing: "-0.02em" }}
              >
                Old vs New regime —{" "}
                <span style={{ color: "var(--success)" }}>with every rupee</span>
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                Upload Form 16 or key in numbers. AI finds every deduction
                you&apos;re missing and shows the exact saving in seconds.
              </p>
            </div>
            <TaxVisual />
          </WobbleCard>

          {/* FIRE Planner — narrow */}
          <WobbleCard
            containerClassName="col-span-1 min-h-[290px] bg-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--primary-subtle)" }}
              >
                <Flame className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                FIRE Planner
              </span>
            </div>
            <h3
              className="text-xl font-bold mb-2"
              style={{ letterSpacing: "-0.02em" }}
            >
              Your exact FIRE age & SIP roadmap
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              Month-by-month plan to financial independence — not guesswork.
            </p>
            <FIREVisual />
          </WobbleCard>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Portfolio X-Ray — narrow */}
          <WobbleCard
            containerClassName="col-span-1 min-h-[270px] bg-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--primary-subtle)" }}
              >
                <ScanLine className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                MF X-Ray
              </span>
            </div>
            <h3
              className="text-xl font-bold mb-2"
              style={{ letterSpacing: "-0.02em" }}
            >
              XIRR, overlap & rebalancing in 10 s
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              Upload CAMS statement — get true XIRR, fund overlap, and an AI
              rebalancing plan.
            </p>
            <XRayVisual />
          </WobbleCard>

          {/* AI Chat — wide */}
          <WobbleCard
            containerClassName="col-span-1 lg:col-span-2 min-h-[270px] bg-card"
          >
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--primary-subtle)" }}
                >
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  AI Money Chat
                </span>
              </div>
              <h3
                className="text-2xl font-bold mb-2"
                style={{ letterSpacing: "-0.02em" }}
              >
                Ask anything.{" "}
                <span className="text-gradient">Context-aware.</span>
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                Already knows your FIRE gap, tax situation, and portfolio. Ask
                follow-ups naturally — no re-entering data.
              </p>
            </div>
            <ChatVisual />
          </WobbleCard>
        </div>

        {/* More tools row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <WobbleCard containerClassName="min-h-[170px] bg-card">
            <div className="flex items-center gap-4">
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" }}
              >
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  Couple&apos;s Planner
                </p>
                <h3
                  className="text-lg font-bold"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  India&apos;s first AI joint planner
                </h3>
                <p
                  className="text-xs mt-1.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Optimise HRA, NPS, SIP splits across two incomes.
                </p>
              </div>
            </div>
          </WobbleCard>

          <WobbleCard containerClassName="min-h-[170px] bg-card">
            <div className="flex items-center gap-4">
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" }}
              >
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  Life Events
                </p>
                <h3
                  className="text-lg font-bold"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Bonus, baby, marriage — handled
                </h3>
                <p
                  className="text-xs mt-1.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  AI advisor for every financial turning point.
                </p>
              </div>
            </div>
          </WobbleCard>
        </div>
      </section>

      {/* ── SECTION DIVIDER ── */}
      <div className="divider-gradient mx-8 sm:mx-16" />

      {/* ── HOW IT WORKS ── */}
      <section className="pb-28 pt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-14 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <p className="text-eyebrow mb-3">How it works</p>
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ letterSpacing: "-0.025em" }}
            >
              From data to plan in{" "}
              <span className="inline-block leading-tight bg-linear-to-r from-primary via-[oklch(0.65_0.18_198)] to-primary bg-size-[200%_auto] bg-clip-text text-transparent animate-[gradient-drift_4s_ease_infinite]">60 seconds</span>
            </h2>
            <p
              className="text-muted-foreground max-w-lg mx-auto mt-3"
            >
              No setup, no bank linking, no waiting for a report.
            </p>
          </motion.div>
        </div>
        <StickyScroll content={STICKY_STEPS} />
      </section>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <motion.div
          className="relative overflow-hidden rounded-3xl p-12 text-center space-y-6 border-gradient-animated grain"
          style={{
            background:
              "linear-gradient(145deg, var(--surface-1), var(--surface-2))",
          }}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Ambient glow layers */}
          <div className="absolute inset-0 hero-glow opacity-70 pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "var(--gradient-mesh)" }}
          />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold badge-primary">
              <Sparkles className="h-3 w-3" />
              Free forever for core tools
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ letterSpacing: "-0.025em" }}
            >
              Take control of your money today
            </h2>
            <p
              className="max-w-lg mx-auto leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              No advisor. No ₹25,000 fee. Just your numbers, our AI, and a
              clear plan.
            </p>
            <div className="flex gap-3 justify-center flex-wrap pt-2">
              <Link href="/tax">
                <MovingBorderButton
                  duration={3200}
                  borderRadius="1.5rem"
                  containerClassName="h-12"
                  borderClassName="bg-[radial-gradient(var(--primary)_40%,transparent_60%)]"
                  className="px-6 text-sm font-semibold text-foreground gap-2"
                >
                  Find my tax savings
                  <ArrowRight className="h-4 w-4" />
                </MovingBorderButton>
              </Link>
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  Sign up free
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--surface-1)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            <IndianRupee className="h-4 w-4 text-primary" />
            <span>© 2026 Money Mentor — Built for India</span>
          </div>
          <div className="flex gap-6 text-sm">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a
                key={l}
                href="#"
                className="transition-colors duration-200 hover:text-foreground"
                style={{ color: "var(--muted-foreground)" }}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
