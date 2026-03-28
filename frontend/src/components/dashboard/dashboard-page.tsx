// frontend/src/components/dashboard/dashboard-page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import {
  HeartPulse, Flame, Receipt, CalendarHeart,
  Users2, ScanLine, ArrowRight, Sparkles,
  TrendingUp, Wallet, ChevronRight, Activity,
  ShieldCheck, Target,
} from "lucide-react";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { LoaderFive } from "@/components/ui/loader";
import { getPortfolio, isProfileEmpty } from "@/lib/portfolio";
import type { PortfolioResponse, UserProfile } from "@/lib/portfolio";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";

// ─── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    href: "/health-score",
    icon: HeartPulse,
    label: "Health Score",
    description: "Get a 0–100 score across 6 financial dimensions",
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-950/40",
    badge: "Popular",
    badgeClass: "badge-primary",
  },
  {
    href: "/fire",
    icon: Flame,
    label: "FIRE Planner",
    description: "Calculate your FI date and the exact SIP to get there",
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-950/40",
    badge: null,
    badgeClass: "",
  },
  {
    href: "/tax",
    icon: Receipt,
    label: "Tax Wizard",
    description: "Old vs New regime with missing deduction detection",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950/40",
    badge: "Save more",
    badgeClass: "badge-success",
  },
  {
    href: "/portfolio",
    icon: ScanLine,
    label: "MF X-Ray",
    description: "Upload your CAMS statement for XIRR and overlap analysis",
    iconColor: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-950/40",
    badge: null,
    badgeClass: "",
  },
  {
    href: "/life-events",
    icon: CalendarHeart,
    label: "Life Events",
    description: "Bonus, inheritance, marriage, baby — get a tailored plan",
    iconColor: "text-pink-600 dark:text-pink-400",
    iconBg: "bg-pink-100 dark:bg-pink-950/40",
    badge: null,
    badgeClass: "",
  },
  {
    href: "/couple-planner",
    icon: Users2,
    label: "Couple Planner",
    description: "Joint HRA, NPS, SIP split and tax co-ordination",
    iconColor: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-950/40",
    badge: "New",
    badgeClass: "badge-warning",
  },
];

// ─── Mount Loader ─────────────────────────────────────────────────────────────
const LOADER_STAGES = [
  "Loading your profile...",
  "Fetching portfolio data...",
  "Running health analysis...",
  "Ready",
];

function DashboardLoader() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % LOADER_STAGES.length);
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      key="loader"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center min-h-[65vh] gap-6"
    >
      {/* shimmer text loader */}
      <LoaderFive text={LOADER_STAGES[stageIndex]} />

      {/* progress dots (important for perceived progress) */}
      <div className="flex items-center gap-1.5">
        {LOADER_STAGES.map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{
              opacity: i === stageIndex ? 1 : 0.3,
              scale: i === stageIndex ? 1.4 : 1,
            }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </div>

      {/* subtle branding (optional but matches old feel) */}
      <p className="text-xs text-muted-foreground">
        ArthSaathi · AI-powered financial command centre
      </p>
    </motion.div>
  );
}

// ─── Hero Header ──────────────────────────────────────────────────────────────
function DashboardHero({ name }: { name?: string }) {
  const greeting = name ? `Welcome back, ${name.split(" ")[0]}` : "Welcome back";

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border-subtle shadow-(--shadow-sm)">
      {/* Layered background: mesh ambient + dot grid texture */}
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute inset-0 dot-grid opacity-50" />
      {/* Hero radial glow from top */}
      <div className="absolute inset-0 hero-glow" />

      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-eyebrow mb-2.5">Dashboard</p>

        <h1
          className="text-display-sm leading-tight"
          style={{
            background: `linear-gradient(135deg,
                          var(--foreground) 0%,
                          var(--primary) 60%,
                          oklch(0.62 0.14 198) 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          {greeting}
        </h1>

        <p className="text-muted-foreground text-sm mt-2.5 max-w-md leading-relaxed">
          Your AI-powered financial command centre.
          Pick a tool below or let the AI walk you through it.
        </p>

        {/* AI CTA pill */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full
            bg-primary text-primary-foreground text-xs font-semibold
            glow-primary hover:bg-primary-hover
            shadow-(--shadow-glow-sm) transition-all duration-200"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Ask AI anything
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ─── Portfolio Pulse Banner ───────────────────────────────────────────────────
function PortfolioPulseBanner({ portfolio }: { portfolio: PortfolioResponse | null }) {
  if (portfolio === null) return null;

  const profile = portfolio.profile as Partial<UserProfile>;
  const empty = isProfileEmpty(portfolio);

  // ── Empty state ──
  if (empty) {
    return (
      <div className="relative rounded-xl">
        {/* Mouse-tracking gradient border glow */}
        <GlowingEffect disabled={false} spread={30} proximity={64} borderWidth={1.5} />

        {/* border-gradient uses CSS trick: card bg + gradient border-box */}
        <div className="relative flex items-center justify-between gap-4
          border-gradient rounded-xl px-5 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center
              shrink-0 glow-pulse">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                Set up your portfolio once — all tools auto-fill
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Save age, income, assets, debts and insurance in one place
              </p>
            </div>
          </div>
          <Link href="/profile" className="shrink-0">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg
              bg-primary text-primary-foreground text-xs font-semibold
              hover:bg-primary-hover transition-colors shadow-(--shadow-sm)">
              Setup <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Profile exists: live stats ──
  const totalAssets = profile.assets
    ? Object.values(profile.assets).reduce((s, v) => s + v, 0)
    : 0;
  const income = profile.monthly_gross_income ?? 0;
  const expenses = profile.monthly_expenses ?? 0;
  const surplus = income - expenses;
  const city = profile.city ?? "";

  const stats = [
    {
      icon: Wallet,
      label: "Monthly Surplus",
      value: surplus > 0 ? `₹${surplus.toLocaleString("en-IN")}` : "—",
      sub: income > 0 ? `${((surplus / income) * 100).toFixed(0)}% of income` : "",
      valueColor: "text-green-600 dark:text-green-400",
      iconColor: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-950/40",
      href: "/health-score",
    },
    {
      icon: TrendingUp,
      label: "Total Investments",
      value: totalAssets > 0
        ? totalAssets >= 1e7
          ? `₹${(totalAssets / 1e7).toFixed(1)} Cr`
          : `₹${(totalAssets / 1e5).toFixed(1)} L`
        : "—",
      sub: "across all asset classes",
      valueColor: "text-blue-600 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-950/40",
      href: "/fire",
    },
    {
      icon: ShieldCheck,
      label: "Protection",
      value: "Active",
      sub: "life + health cover",
      valueColor: "text-primary",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      href: "/health-score",
    },
  ];

  return (
    <div className="relative rounded-xl">
      <GlowingEffect disabled={false} spread={30} proximity={64} borderWidth={1.5} />

      <div className="relative bg-card border border-border rounded-xl overflow-hidden
        shadow-(--shadow-card)">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3
          border-b border-border-subtle bg-muted/30">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Portfolio Pulse
            </span>
            {city && (
              <span className="text-xs text-muted-foreground">· {city}</span>
            )}
            {/* Live pulse dot */}
            <span className="flex items-center gap-1 ml-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success
                animate-[pulse_2s_ease-in-out_infinite]" />
              <span className="text-[10px] text-success font-semibold">Live</span>
            </span>
          </div>
          <Link href="/profile"
            className="text-xs text-primary hover:underline font-medium">
            Edit profile
          </Link>
        </div>

        {/* Stat columns */}
        <div className="grid grid-cols-3 divide-x divide-border-subtle">
          {stats.map(({ icon: Icon, label, value, sub, valueColor, iconColor, iconBg, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col gap-2 px-4 py-5
                hover:bg-muted/40 transition-colors duration-150"
            >
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shadow-(--shadow-xs)",
                iconBg, iconColor,
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-none mb-1.5">
                  {label}
                </p>
                <p className={cn("text-lg font-bold leading-none tabular-nums", valueColor)}>
                  {value}
                </p>
                {sub && (
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{sub}</p>
                )}
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground mt-auto
                group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────
function ToolCard({
  href, icon: Icon, label, description,
  iconColor, iconBg, badge, badgeClass,
}: typeof TOOLS[number]) {
  return (
    <Link
      href={href}
      className={cn(
        // card-elevated = bg-surface-2 + shadow-md + border-subtle from globals.css
        "group relative flex flex-col gap-4 rounded-xl p-5 card-elevated",
        "hover:shadow-(--shadow-lg) hover:-translate-y-1 hover:border-primary/40",
        "transition-all duration-200 overflow-hidden",
      )}
    >
      {/* Shimmer brand sweep — only visible on hover */}
      <div className="absolute inset-0 shimmer-brand opacity-0
        group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
          "shadow-(--shadow-xs)",
          iconBg, iconColor,
        )}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              badgeClass,
            )}>
              {badge}
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground
            group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      <div className="relative">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* Bottom accent line — slides up on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5
        bg-linear-to-r from-transparent via-primary/40 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Link>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {/* text-eyebrow = 0.75rem, font-600, uppercase, letter-spacing, color:primary */}
      <p className="text-eyebrow whitespace-nowrap">{children}</p>
      {/* divider-gradient = horizontal gradient line from globals.css */}
      <div className="flex-1 divider-gradient" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const user = authService.getStoredUser();
  const firstName = user?.full_name?.split(" ")[0];

  useEffect(() => {
    const minDelay = new Promise<void>((r) => setTimeout(r, 2500));
    const fetchData = getPortfolio()
      .then(setPortfolio)
      .catch(() =>
        setPortfolio({
          user_id: "", profile: {}, fire: {}, health: {},
          tax: {}, mf: {}, couple: {}, life_event: {},
        })
      );
    Promise.all([minDelay, fetchData]).then(() => setIsLoading(false));
  }, []);

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <DashboardLoader key="loader" />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* ── Hero ── */}
              <DashboardHero name={firstName} />

            {/* ── Portfolio Pulse ── */}
            <div className="space-y-3">
              <SectionLabel>Portfolio Pulse</SectionLabel>
              <PortfolioPulseBanner portfolio={portfolio} />
            </div>

            {/* ── Tools ── */}
            <div className="space-y-3">
              <SectionLabel>Your Tools</SectionLabel>
              <StaggerList>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TOOLS.map((tool) => (
                    <StaggerItem key={tool.href}>
                      <ToolCard {...tool} />
                    </StaggerItem>
                  ))}
                </div>
              </StaggerList>
            </div>

            {/* ── Footer nudge ── */}
            <div className="flex items-center justify-center gap-2 pt-1 pb-4">
              <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground text-center">
                All tools use your saved profile — set it up once in{" "}
                <Link href="/profile" className="text-primary hover:underline font-medium">
                  Profile
                </Link>{" "}
                and every analysis auto-fills.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
