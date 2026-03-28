// src/app/page.tsx
"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import NumberFlow from "@number-flow/react";
import { Button } from "@/components/ui/button";
import { TerminalDemo } from "@/components/ui/terminal-demo";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { MovingBorderButton } from "@/components/ui/moving-border";
import {
  ArrowRight, Sparkles, Calculator, Flame, ScanLine,
  Users, CalendarClock, MessageCircle, Upload, Cpu,
  BarChart3, Lightbulb, IndianRupee, TrendingUp,
} from "lucide-react";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { cn } from "@/lib/utils";

// ─── STAT COUNTER ─────────────────────────────────────────────────────────────
function StatCounter({
  value, suffix = "", label, sublabel,
  icon: Icon,
}: {
  value: number; suffix?: string;
  label: string; sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const displayValue = inView ? value : 0;

  return (
    <div ref={ref} className="text-center group relative p-10">
      {/* hover glow swell using primary-subtle */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
        transition-opacity duration-500 pointer-events-none"
        style={{ background: "var(--primary-subtle)" }} />

      {Icon && (
        <div className="mx-auto mb-3 size-10 rounded-xl flex items-center justify-center"
          style={{
            background: "var(--primary-subtle)",
            border: "1px solid var(--primary-muted)",
          }}>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      )}

      {/* text-stat pattern: tabular-nums, tight tracking, large */}
      <div className="text-3xl sm:text-4xl font-bold tabular-nums flex items-baseline
        justify-center gap-0.5" style={{ letterSpacing: "-0.04em" }}>
        <NumberFlow
          value={displayValue}
          format={{
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }}
          transformTiming={{ duration: 1200, easing: "cubic-bezier(0.16,1,0.3,1)" }}
          spinTiming={{ duration: 1200 }}
          opacityTiming={{ duration: 300 }}
        />
        {suffix && <span className="text-primary text-xl sm:text-2xl">{suffix}</span>}
      </div>

      <p className="text-sm font-semibold text-foreground mt-1">{label}</p>
      {sublabel && (
        <p className="text-[11px] mt-0.5 text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────
// Replaces WobbleCard — uses card-elevated + shimmer-brand + border-gradient for featured
function FeatureCard({
  children,
  className,
  featured = false,   // featured cards get border-gradient + slightly deeper shadow
}: {
  children: React.ReactNode;
  className?: string;
  featured?: boolean;
}) {
  return (
    <div className={cn(
      // card-elevated = bg-surface-2 + shadow-md + border-subtle (from globals.css)
      "group relative rounded-2xl overflow-hidden",
      "card-elevated",
      "hover:shadow-(--shadow-lg) hover:-translate-y-1",
      featured && "hover:border-primary/40",
      "transition-all duration-200",
      className,
    )}>
      {/* shimmer-brand: teal shimmer sweep visible only on hover */}
      <div className="absolute inset-0 shimmer-brand opacity-0
        group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5
        bg-linear-to-r from-transparent via-primary/40 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-8">
        {children}
      </div>
    </div>
  );
}

// ─── FEATURE CARD — WIDE FEATURED variant ─────────────────────────────────────
// Featured wide cards get a faint mesh bg + hero-glow overlay for depth
function FeatureCardWide({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "group relative rounded-2xl overflow-hidden",
      "card-elevated",
      "hover:shadow-(--shadow-lg) hover:-translate-y-0.5 hover:border-primary/40",
      "transition-all duration-200",
      className,
    )}>
      {/* Subtle mesh ambient inside card */}
      <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
      {/* Dot grid texture */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      {/* shimmer-brand on hover */}
      <div className="absolute inset-0 shimmer-brand opacity-0
        group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5
        bg-linear-to-r from-transparent via-primary/50 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-8">
        {children}
      </div>
    </div>
  );
}

// ─── ICON BADGE ───────────────────────────────────────────────────────────────
function IconBadge({
  icon: Icon,
  color = "primary",
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color?: "primary" | "success" | "warning" | "info";
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" },
    success: { background: "var(--success-subtle)", border: "1px solid oklch(0.60 0.21 145 / 0.22)" },
    warning: { background: "var(--warning-subtle)", border: "1px solid oklch(0.72 0.17 78 / 0.22)" },
    info: { background: "var(--info-subtle)", border: "1px solid oklch(0.58 0.16 240 / 0.22)" },
  };
  const iconColors: Record<string, string> = {
    primary: "text-primary", success: "text-success",
    warning: "text-warning", info: "text-info",
  };
  return (
    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
      style={styles[color]}>
      <Icon className={cn("h-4 w-4", iconColors[color])} />
    </div>
  );
}

// ─── MINI VISUALS ─────────────────────────────────────────────────────────────
function TaxVisual() {
  return (
    <div className="mt-6 flex flex-col gap-3 p-4 rounded-xl shadow-(--shadow-xs)"
      style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>Old Regime</span>
        <span className="font-bold text-success">Save ₹47,200 →</span>
        <span>New Regime</span>
      </div>
      <div className="flex gap-1.5 items-end h-24">
        {[65, 55, 48, 40, 32].map((h, i) => (
          <motion.div key={i} className="flex-1 rounded-t"
            style={{ background: i < 3 ? "var(--primary-muted)" : "var(--primary)", opacity: i < 3 ? 0.55 : 1 }}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease: "easeOut" }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">₹1.84L tax</span>
        <span className="font-semibold text-success">₹1.37L tax ✓</span>
      </div>
    </div>
  );
}

function FIREVisual() {
  return (
    <div className="mt-6 space-y-3 p-4 rounded-xl shadow-(--shadow-xs)"
      style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center gap-3">
        <div className="text-4xl font-bold text-primary tabular-nums" style={{ letterSpacing: "-0.04em" }}>
          48
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Corpus</span>
            <span className="text-primary font-semibold">67%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <motion.div className="h-full rounded-full" style={{ background: "var(--gradient-primary)" }}
              initial={{ width: "0%" }} whileInView={{ width: "67%" }}
              viewport={{ once: true }} transition={{ delay: 0.4, duration: 1, ease: "easeOut" }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {[{ v: "₹28K", l: "SIP/mo" }, { v: "18 yrs", l: "To FIRE" }, { v: "12.5%", l: "CAGR" }].map((s) => (
          <div key={s.l} className="rounded-lg py-2"
            style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" }}>
            <div className="text-xs font-bold text-primary">{s.v}</div>
            <div className="text-[9px] mt-0.5 text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function XRayVisual() {
  return (
    <div className="mt-6 p-4 rounded-xl space-y-2.5 shadow-(--shadow-xs)"
      style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">Overlap detected</span>
        <span className="font-bold text-destructive">⚠ 22%</span>
      </div>
      {[
        { label: "XIRR", val: "14.2%", color: "var(--primary)", w: "70%" },
        { label: "Exp ratio", val: "0.89%", color: "var(--destructive)", w: "30%" },
      ].map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="text-[10px] w-16 shrink-0 text-muted-foreground">{r.label}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <motion.div className="h-full rounded-full" style={{ background: r.color }}
              initial={{ width: 0 }} whileInView={{ width: r.w }}
              viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
          <span className="text-[10px] font-semibold w-10 text-right shrink-0"
            style={{ color: r.color }}>{r.val}</span>
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
    <div className="mt-6 p-4 rounded-xl space-y-2 shadow-(--shadow-xs)"
      style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}>
      {msgs.map((m, i) => (
        <motion.div key={i}
          className={`flex text-[11px] ${m.role === "user" ? "justify-end" : "justify-start"}`}
          initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
          <div className="px-2.5 py-1.5 rounded-xl max-w-[88%] leading-relaxed"
            style={m.role === "user"
              ? { background: "var(--primary-subtle)", color: "var(--primary)", border: "1px solid var(--primary-muted)" }
              : { background: "var(--surface-1)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
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
    description: "Drop your CAMS statement, Form 16, or fill in a few numbers. No bank login, no linking, no risk. Your data stays yours.",
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-5 p-6">
        <div className="relative size-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" }}>
          <Upload className="h-8 w-8 text-primary" />
          <motion.div className="absolute inset-0 rounded-2xl"
            style={{ border: "1.5px solid var(--primary)" }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 2.4 }} />
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-sm font-semibold text-foreground">CAMS statement</p>
          <p className="text-xs text-muted-foreground">PDF · 342 KB · uploaded</p>
        </div>
        <div className="w-full max-w-44 rounded-full h-1.5 overflow-hidden"
          style={{ background: "var(--border)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "var(--gradient-primary)" }}
            initial={{ width: "0%" }} whileInView={{ width: "100%" }}
            viewport={{ once: true }} transition={{ duration: 1.8, ease: "easeInOut" }} />
        </div>
      </div>
    ),
  },
  {
    title: "AI processes in seconds",
    description: "Our model runs XIRR calculations, tax regime comparisons, FIRE projections, and overlap analysis simultaneously — not rules, actual inference.",
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="relative size-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" }}>
          <Cpu className="h-8 w-8 text-primary" />
          <motion.div className="absolute -inset-3 rounded-3xl"
            style={{ border: "1px solid var(--primary-muted)" }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }} />
        </div>
        <div className="grid grid-cols-2 gap-1.5 w-full max-w-50 text-[11px]">
          {["Tax analysis", "FIRE projection", "Overlap scan", "XIRR calc"].map((t, i) => (
            <motion.div key={t} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
              <span className="size-1.5 rounded-full shrink-0" style={{ background: "var(--primary)" }} />
              <span className="text-muted-foreground">{t}</span>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Insights appear instantly",
    description: "Not a PDF you'll never read. Live charts, animated numbers, regime comparisons — everything at a glance.",
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div className="relative size-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--success-subtle)", border: "1px solid oklch(0.60 0.21 145 / 0.25)" }}>
          <BarChart3 className="h-8 w-8 text-success" />
        </div>
        <div className="w-full max-w-50 space-y-1.5">
          {[
            { label: "Tax saved", val: "₹47,200", color: "var(--success)" },
            { label: "XIRR", val: "14.2%", color: "var(--primary)" },
            { label: "FIRE gap", val: "₹1.68Cr", color: "var(--warning)" },
          ].map((r, i) => (
            <div key={r.label} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="size-1.5 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="text-[11px] flex-1 text-muted-foreground">{r.label}</span>
              <motion.span className="text-[11px] font-semibold" style={{ color: r.color }}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }}>
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
    description: "Actionable next steps ranked by impact. Switch regime, increase SIP by ₹3K, rebalance two overlapping funds. No jargon, just tasks.",
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div className="relative size-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" }}>
          <Lightbulb className="h-8 w-8 text-primary" />
        </div>
        <div className="w-full max-w-56 space-y-1.5">
          {[
            "Switch to New Regime → save ₹47,200",
            "Increase SIP ₹3K/mo → retire 2 yrs earlier",
            "Exit Axis Bluechip — 22% overlap",
          ].map((action, i) => (
            <motion.div key={i} className="flex items-start gap-1.5 text-[10px] rounded-lg px-2.5 py-1.5"
              style={{ color: "var(--muted-foreground)", background: "var(--surface-2)", border: "1px solid var(--border)" }}
              initial={{ opacity: 0, y: 5 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.18 }}>
              <span className="font-bold shrink-0 mt-px text-success">{i + 1}.</span>
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
      {/* glass = oklch backdrop-blur card bg; border-subtle underneath */}
      <nav className="sticky top-0 z-50 glass"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg group">
            {/* glow-primary: shadow-glow box-shadow that intensifies on hover */}
            <div className="h-8 w-8 rounded-lg flex items-center justify-center
              transition-all duration-200 group-hover:scale-105 glow-primary"
              style={{
                background: "var(--primary-subtle)",
                border: "1px solid var(--primary-muted)",
              }}>
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
            <span className="text-foreground">Money Mentor</span>
          </Link>

          <div className="flex gap-2">
            <Link href="/signin"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-lg"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", boxShadow: "var(--shadow-glow-sm)" }}>
                Get Started
              </Button>
            </Link>
            <ToggleTheme />
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <HeroHighlight containerClassName="min-h-[92vh] !bg-background relative"
        className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* dot-grid-fine: denser 18px dot texture for hero areas */}
        <div className="absolute inset-0 dot-grid-fine pointer-events-none" />
        {/* hero-glow: radial-gradient bloom from top using primary */}
        <div className="absolute inset-x-0 -top-24 h-96 hero-glow pointer-events-none" />
        {/* Extra ambient radial on right side */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 40% at 75% 50%, var(--primary-subtle) 0%, transparent 70%)" }} />

        <div className="relative w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20 lg:py-0 min-h-[92vh]">

          {/* ── Copy ── */}
          <motion.div className="text-center lg:text-left space-y-8"
            initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>

            {/* badge-primary = primary-subtle bg + primary color + primary-muted border */}
            <motion.div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold badge-primary"
              initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}>
              <Sparkles className="h-3 w-3" />
              AI-Powered · Built for India
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight space-y-4.5"
              style={{ lineHeight: 1.08, letterSpacing: "-0.03em" }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <div>Save{" "}</div>
              <div>
                <Highlight className="text-foreground whitespace-nowrap">₹47,200 in taxes.</Highlight>
                <br />
              </div>
              {/* text-gradient = gradient-primary bg-clip-text */}
              <div>Retire by <span className="text-gradient">48.</span></div>
            </motion.h1>

            <motion.p className="text-lg max-w-md mx-auto lg:mx-0 leading-relaxed text-muted-foreground"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.55 }}>
              AI that analyses your taxes, FIRE path, and portfolio in seconds —
              no CA, no ₹25,000 fee, no jargon.
            </motion.p>

            <motion.div className="flex gap-3 justify-center lg:justify-start flex-wrap"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5 }}>
              <Link href="/tax">
                <MovingBorderButton duration={3200} borderRadius="1.5rem"
                  containerClassName="h-12"
                  borderClassName="bg-[radial-gradient(var(--primary)_40%,transparent_60%)]"
                  className="px-6 text-sm font-semibold text-foreground gap-2">
                  Find my tax savings <ArrowRight className="h-4 w-4" />
                </MovingBorderButton>
              </Link>
              <Link href="/fire">
                <Button size="lg" variant="outline" className="h-12 rounded-xl gap-2"
                  style={{ borderColor: "var(--border-strong)" }}>
                  Calculate my FIRE <Flame className="h-4 w-4 text-primary" />
                </Button>
              </Link>
            </motion.div>

            <motion.p className="text-[12px] flex items-center gap-2 justify-center lg:justify-start text-muted-foreground"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
              <span className="size-1.5 rounded-full inline-block bg-success" />
              Free forever · No credit card required
            </motion.p>
          </motion.div>

          {/* Terminal — float animation from globals.css */}
          <motion.div className="w-full float"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <TerminalDemo />
          </motion.div>
        </div>
      </HeroHighlight>

      {/* ── STATS BAR ── */}
      {/* surface-1 = pure white/navy card; border top + bottom */}
      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface-1)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-3 gap-8 sm:gap-10">
          <StatCounter value={47200} label="Avg tax savings" sublabel="per user on first run" icon={Calculator} />
          <StatCounter value={48} suffix=" yrs" label="Avg FIRE age" sublabel="for on-track users" icon={TrendingUp} />
          <StatCounter value={14.2} suffix="%" label="Avg portfolio XIRR" sublabel="vs 11% benchmark" icon={BarChart3} />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
        <motion.div className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
          {/* text-eyebrow = 0.75rem uppercase tracking letter-spacing color:primary */}
          <p className="text-eyebrow">Six tools. One platform.</p>
          <h2 className="text-3xl sm:text-4xl font-bold" style={{ letterSpacing: "-0.025em" }}>
            Everything your CA should have told you
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
            Designed for Indian investors who want clarity, not jargon.
          </p>
        </motion.div>

        {/* ── Row 1 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Tax Wizard — wide featured card */}
          <FeatureCardWide className="col-span-1 lg:col-span-2 min-h-72.5">
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <IconBadge icon={Calculator} color="success" />
                <span className="text-xs font-semibold uppercase tracking-wider text-success">
                  Tax Wizard
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ letterSpacing: "-0.02em" }}>
                Old vs New regime —{" "}
                <span className="text-success">with every rupee</span>
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Upload Form 16 or key in numbers. AI finds every deduction
                you&apos;re missing and shows the exact saving in seconds.
              </p>
            </div>
            <TaxVisual />
          </FeatureCardWide>

          {/* FIRE Planner — narrow */}
          <FeatureCard className="col-span-1 min-h-72.5">
            <div className="flex items-center gap-2 mb-3">
              <IconBadge icon={Flame} color="primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">FIRE Planner</span>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ letterSpacing: "-0.02em" }}>
              Your exact FIRE age & SIP roadmap
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Month-by-month plan to financial independence — not guesswork.
            </p>
            <FIREVisual />
          </FeatureCard>
        </div>

        {/* ── Row 2 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* MF X-Ray — narrow */}
          <FeatureCard className="col-span-1 min-h-67.5">
            <div className="flex items-center gap-2 mb-3">
              <IconBadge icon={ScanLine} color="primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">MF X-Ray</span>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ letterSpacing: "-0.02em" }}>
              XIRR, overlap & rebalancing in 10 s
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Upload CAMS statement — get true XIRR, fund overlap, and an AI rebalancing plan.
            </p>
            <XRayVisual />
          </FeatureCard>

          {/* AI Chat — wide featured */}
          <FeatureCardWide className="col-span-1 lg:col-span-2 min-h-67.5">
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <IconBadge icon={MessageCircle} color="primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Money Chat</span>
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ letterSpacing: "-0.02em" }}>
                Ask anything.{" "}
                {/* text-gradient = gradient-primary background-clip text */}
                <span className="text-gradient">Context-aware.</span>
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Already knows your FIRE gap, tax situation, and portfolio. Ask
                follow-ups naturally — no re-entering data.
              </p>
            </div>
            <ChatVisual />
          </FeatureCardWide>
        </div>

        {/* ── More tools row — compact horizontal cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {[
            {
              icon: Users, label: "Couple\u2019s Planner",
              title: "India\u2019s first AI joint planner",
              desc: "Optimise HRA, NPS, SIP splits across two incomes.",
            },
            {
              icon: CalendarClock, label: "Life Events",
              title: "Bonus, baby, marriage \u2014 handled",
              desc: "AI advisor for every financial turning point.",
            },
          ].map((card) => (
            <FeatureCard key={card.label} className="min-h-40">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0
                  shadow-(--shadow-xs)"
                  style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" }}>
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                    {card.label}
                  </p>
                  <h3 className="text-lg font-bold" style={{ letterSpacing: "-0.02em" }}>
                    {card.title}
                  </h3>
                  <p className="text-xs mt-1.5 text-muted-foreground">{card.desc}</p>
                </div>
              </div>
            </FeatureCard>
          ))}
        </div>
      </section>

      {/* divider-gradient: 1px transparent→border→border-strong→transparent line */}
      <div className="divider-gradient mx-8 sm:mx-16" />

      {/* ── HOW IT WORKS ── */}
      <section className="pb-28 pt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-14 space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.55 }}>
            <p className="text-eyebrow mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ letterSpacing: "-0.025em" }}>
              From data to plan in{" "}
              {/* text-gradient-animated = gradient-primary 200% bg-size, drifts */}
              <span
                style={{
                  background: "linear-gradient(135deg, var(--primary), oklch(0.65 0.18 198), var(--primary))",
                  backgroundSize: "200% auto",
                  backgroundPosition: "0% 50%",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                  display: "inline-block",
                  animation: "gradient-drift 4s ease infinite",
                }}
              >60 seconds</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mt-3">
              No setup, no bank linking, no waiting for a report.
            </p>
          </motion.div>
        </div>
        <StickyScroll content={STICKY_STEPS} />
      </section>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        {/* border-gradient-animated = animated gradient border-box trick; grain = ::after noise overlay */}
        <motion.div
          className="relative overflow-hidden rounded-3xl p-12 text-center space-y-6 border-gradient-animated grain"
          style={{ background: "linear-gradient(145deg, var(--surface-1), var(--surface-2))" }}
          initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>

          {/* Layered ambient: hero-glow + gradient-mesh */}
          <div className="absolute inset-0 hero-glow opacity-70 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
          {/* Top edge highlight line */}
          <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />

          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold badge-primary">
              <Sparkles className="h-3 w-3" />
              Free forever for core tools
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ letterSpacing: "-0.025em" }}>
              Take control of your money today
            </h2>
            <p className="max-w-lg mx-auto leading-relaxed text-muted-foreground">
              No advisor. No ₹25,000 fee. Just your numbers, our AI, and a clear plan.
            </p>
            <div className="flex gap-3 justify-center flex-wrap pt-2">
              <Link href="/tax">
                <MovingBorderButton duration={3200} borderRadius="1.5rem"
                  containerClassName="h-12"
                  borderClassName="bg-[radial-gradient(var(--primary)_40%,transparent_60%)]"
                  className="px-6 text-sm font-semibold text-foreground gap-2">
                  Find my tax savings <ArrowRight className="h-4 w-4" />
                </MovingBorderButton>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="h-12 rounded-xl"
                  style={{ borderColor: "var(--border-strong)" }}>
                  Sign up free
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface-1)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10
          flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span>© 2026 Money Mentor — Built for India</span>
          </div>
          <div className="flex gap-6 text-sm">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a key={l} href="#"
                className="transition-colors duration-200 hover:text-foreground text-muted-foreground">
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
