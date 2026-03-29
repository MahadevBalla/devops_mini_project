// frontend/src/components/chat/suggestion-chips.tsx
"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { label: "What's my FIRE status?",       emoji: "🔥" },
  { label: "How can I save more tax?",      emoji: "💰" },
  { label: "Review my health score",        emoji: "❤️" },
  { label: "What SIP amount do I need?",    emoji: "📈" },
  { label: "Am I on track to retire early?",emoji: "⏱️" },
  { label: "Where am I overspending?",      emoji: "🔍" },
];

interface Props {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({ onSelect, disabled }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 gap-8">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-3 mt-20"
      >
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Your Money Mentor</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          I know your FIRE plan, health score, and tax situation.
          Ask me anything specific to <em>your</em> numbers.
        </p>
      </motion.div>

      {/* 2×3 grid of suggestion cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 gap-2.5 w-full max-w-lg"
      >
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            onClick={() => onSelect(s.label)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border",
              "bg-card text-sm text-foreground text-left",
              "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
              "transition-all duration-150 active:scale-95",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <span className="text-base shrink-0">{s.emoji}</span>
            <span className="leading-snug">{s.label}</span>
          </motion.button>
        ))}
      </motion.div>

    </div>
  );
}