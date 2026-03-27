// frontend/src/components/layout/app-shell.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "./page-transition";

import {
  Settings, LogOut, Loader2, Sparkles,
  LayoutDashboard, MessageCircle, HeartPulse,
  Flame, Receipt, CalendarHeart, Users2,
  ScanLine, ChevronLeft, Menu,
} from "lucide-react";
import { authService } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/chat", icon: MessageCircle, label: "AI Mentor" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/health-score", icon: HeartPulse, label: "Health Score" },
      { href: "/fire", icon: Flame, label: "FIRE Planner" },
      { href: "/tax", icon: Receipt, label: "Tax Wizard" },
      { href: "/portfolio", icon: ScanLine, label: "MF X-Ray" },
    ],
  },
  {
    label: "Planners",
    items: [
      { href: "/life-events", icon: CalendarHeart, label: "Life Events" },
      { href: "/couple-planner", icon: Users2, label: "Couple Planner" },
    ],
  },
];

interface AppShellProps { children: React.ReactNode }

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
      router.push("/signin");
    } catch {
      router.push("/signin");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* Mobile overlay — unchanged */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-60 bg-card border-r border-border z-30 flex flex-col",
          // Mobile: slide in/out. Desktop: always visible.
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo — unchanged */}
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-border flex-shrink-0">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="text-base font-semibold">Money Mentor</span>
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* ── Nav with animated pill ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href
                  || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 group"
                  >
                    {/* ── Active sliding pill (navigates between items) ── */}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-lg bg-primary/10"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}

                    {/* ── Hover pill (per-item, fades in/out on this item only) ── */}
                    {!active && (
                      <motion.div
                        className="absolute inset-0 rounded-lg bg-accent"
                        initial={{ opacity: 0, scale: 0.97 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15 }}
                      />
                    )}

                    {/* ── Active left border accent (slides with active pill) ── */}
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-border"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}

                    {/* ── Icon ── */}
                    <Icon
                      className={cn(
                        "relative z-10 h-4 w-4 flex-shrink-0 transition-colors duration-150",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />

                    {/* ── Label ── */}
                    <span
                      className={cn(
                        "relative z-10 transition-colors duration-150",
                        active
                          ? "text-primary font-medium"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-3 py-3 flex-shrink-0 space-y-1">

          {/* ── Settings link — now animated like nav items ── */}
          {(() => {
            const active = pathname === "/profile" || pathname.startsWith("/profile/");
            return (
              <Link
                href="/profile"
                onClick={() => setSidebarOpen(false)}
                className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm group"
              >
                {/* Active sliding pill — uses SAME layoutId as nav items */}
                {active && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}

                {/* Hover pill */}
                {!active && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-accent"
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  />
                )}

                {/* Active left border accent — uses SAME layoutId as nav items */}
                {active && (
                  <motion.div
                    layoutId="sidebar-active-border"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}

                <Settings
                  className={cn(
                    "relative z-10 h-4 w-4 flex-shrink-0 transition-colors duration-150",
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span
                  className={cn(
                    "relative z-10 transition-colors duration-150",
                    active
                      ? "text-primary font-medium"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  Settings
                </span>
              </Link>
            );
          })()}

          {/* Logout button — no pill, keep as-is */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
          >
            {isLoggingOut
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <LogOut className="h-4 w-4" />
            }
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main content — unchanged */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <header className="flex items-center h-16 px-4 border-b border-border bg-card lg:hidden flex-shrink-0">
          <button
            className="p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">Money Mentor</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}