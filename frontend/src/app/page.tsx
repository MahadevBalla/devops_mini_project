"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/vercel-tabs';
import { ScrollAnimatedText } from '@/components/text-scroll-animation';
import { Sparkles, ArrowRight, Heart, Flame, DollarSign, TrendingUp } from 'lucide-react';

const TAB_ITEMS = [
  { id: 'features', label: 'Features' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'pricing', label: 'Pricing' },
];

const FEATURES = {
  features: [
    { icon: Heart, title: 'Health Score', desc: 'Comprehensive financial health assessment across 6 dimensions' },
    { icon: Flame, title: 'FIRE Planner', desc: 'Calculate your financial independence date and SIP requirements' },
    { icon: DollarSign, title: 'Tax Wizard', desc: 'Old vs New regime comparison with missing deduction detection' },
    { icon: TrendingUp, title: 'Portfolio X-Ray', desc: 'Upload CAMS statement for XIRR, overlap, and rebalancing analysis' },
  ],
  benefits: [
    { icon: Sparkles, title: 'AI-Powered', desc: 'Advanced AI agent pipeline for intelligent financial advice' },
    { icon: TrendingUp, title: 'Real-Time', desc: 'Instant portfolio analysis and market-aligned recommendations' },
    { icon: Heart, title: 'Personalized', desc: 'Tailored plans for couples, families, and individual investors' },
    { icon: Flame, title: 'Expert Grade', desc: 'Built on Indian financial planning algorithms and tax expertise' },
  ],
  pricing: [
    { icon: Sparkles, title: 'Free Tier', desc: 'Health Score, FIRE calc, Tax comparison - forever free' },
    { icon: TrendingUp, title: 'Pro', desc: '₹99/mo - MF X-Ray, Life Events, Couple Planner, Priority support' },
    { icon: Heart, title: 'Premium', desc: '₹299/mo - AI Mentor chat, Advanced reports, Tax filing automation' },
    { icon: Flame, title: 'Enterprise', desc: 'Custom solutions for wealth firms and financial advisors' },
  ],
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('features');

  const currentContent = FEATURES[activeTab as keyof typeof FEATURES];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span>Money Mentor</span>
          </Link>
          <div className="flex gap-3">
            <Link href="/signin">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Your <span className="text-primary">AI-powered</span> financial command centre
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get personalized financial planning advice powered by our advanced AI agents. From tax optimization to retirement planning, we&apos;ve got you covered.
            </p>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Explore Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline">Sign Up Free</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-12">
            <div className="text-center">
              <p className="text-2xl font-bold">6</p>
              <p className="text-sm text-muted-foreground">Financial Tools</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">10K+</p>
              <p className="text-sm text-muted-foreground">Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">₹500Cr+</p>
              <p className="text-sm text-muted-foreground">Managed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Demo Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">
              <ScrollAnimatedText text="What You Get" charClassName="text-foreground" />
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore our comprehensive suite of financial planning tools designed for Indian investors
            </p>
          </div>

          {/* Tabs Component Demo */}
          <div className="bg-card border border-border rounded-xl p-8">
            <Tabs
              tabs={TAB_ITEMS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              className="flex justify-center mb-12"
            />

            {/* Tab Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentContent.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="group p-6 rounded-lg border border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/60 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-12 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to take control?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Start your financial planning journey with Money Mentor today. No credit card required.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
            <p className="text-sm text-muted-foreground">© 2026 Money Mentor. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}