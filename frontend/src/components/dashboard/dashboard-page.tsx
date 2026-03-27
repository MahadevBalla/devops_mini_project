"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  HeartPulse, Flame, Receipt, CalendarHeart, Users2, ScanLine, ArrowRight
} from "lucide-react";
import { StaggerItem, StaggerList } from "../ui/stagger-list";

const TOOLS = [
  {
    href: "/health-score",
    icon: HeartPulse,
    label: "Health Score",
    description: "Get a 0–100 score across 6 financial dimensions",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  },
  {
    href: "/fire",
    icon: Flame,
    label: "FIRE Planner",
    description: "Calculate your FI date and the exact SIP to get there",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  },
  {
    href: "/tax",
    icon: Receipt,
    label: "Tax Wizard",
    description: "Old vs New regime with missing deduction detection",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    href: "/portfolio",
    icon: ScanLine,
    label: "MF X-Ray",
    description: "Upload your CAMS statement for XIRR and overlap analysis",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
  {
    href: "/life-events",
    icon: CalendarHeart,
    label: "Life Events",
    description: "Bonus, inheritance, marriage, baby — get a tailored plan",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
  },
  {
    href: "/couple-planner",
    icon: Users2,
    label: "Couple Planner",
    description: "Joint HRA, NPS, SIP split and tax co-ordination",
    color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  },
];

export function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your AI-powered financial command centre. Pick a tool to get started.
          </p>
        </div>

        <StaggerList>
          <StaggerItem>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tool.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h2 className="mt-4 text-sm font-semibold">{tool.label}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                  </Link>
                );
              })}
            </div>
          </StaggerItem>
        </StaggerList>

      </div>
    </AppShell>
  );
}
