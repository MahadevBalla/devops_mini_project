// frontend/src/components/couple-planner/steps/step-goals.tsx
"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn }     from "@/lib/utils";
import type { CoupleFormState, JointGoal, GoalType } from "@/lib/couple-types";

interface Props {
  form: CoupleFormState;
  onChange: (patch: Partial<CoupleFormState>) => void;
}

const GOAL_PRESETS: { type: GoalType; emoji: string; label: string; placeholder: number }[] = [
  { type: "house",     emoji: "🏠", label: "Buy a Home",       placeholder: 8000000  },
  { type: "education", emoji: "🎓", label: "Child's Education", placeholder: 3000000  },
  { type: "vacation",  emoji: "✈️",  label: "Big Vacation",     placeholder: 500000   },
  { type: "marriage",  emoji: "💍", label: "Wedding Fund",      placeholder: 1500000  },
  { type: "custom",    emoji: "🎯", label: "Custom Goal",       placeholder: 1000000  },
];

const CURRENT_YEAR = new Date().getFullYear();

export function StepGoals({ form, onChange }: Props) {
  const [addingType, setAddingType] = useState<GoalType | null>(null);
  const [draft, setDraft] = useState({ target_amount: "", target_year: "" });

  function addGoal() {
    if (!addingType || !draft.target_amount || !draft.target_year) return;
    const preset = GOAL_PRESETS.find((g) => g.type === addingType)!;
    const goal: JointGoal = {
      type:          addingType,
      label:         preset.label,
      target_amount: Number(draft.target_amount),
      target_year:   Number(draft.target_year),
    };
    onChange({ joint_goals: [...form.joint_goals, goal] });
    setAddingType(null);
    setDraft({ target_amount: "", target_year: "" });
  }

  function removeGoal(i: number) {
    onChange({ joint_goals: form.joint_goals.filter((_, j) => j !== i) });
  }

  const usedTypes = form.joint_goals.map((g) => g.type);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium">Any joint financial goals?</p>
        <p className="text-xs text-muted-foreground mt-1">
          Optional — the SIP split is optimised to fund these. Skip if you don&apos;t have specific goals yet.
        </p>
      </div>

      {/* Added goals chips */}
      {form.joint_goals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {form.joint_goals.map((g, i) => {
            const preset = GOAL_PRESETS.find((p) => p.type === g.type);
            return (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-xs font-medium text-primary">
                <span>{preset?.emoji}</span>
                <span>{g.label}</span>
                <span className="text-muted-foreground">·</span>
                <span>₹{(g.target_amount / 1e5).toFixed(0)}L</span>
                <span className="text-muted-foreground">·</span>
                <span>{g.target_year}</span>
                <button type="button" onClick={() => removeGoal(i)}
                  className="ml-1 hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal preset cards */}
      {!addingType && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {GOAL_PRESETS.map((preset) => {
            const used = usedTypes.includes(preset.type);
            return (
              <button
                key={preset.type}
                type="button"
                disabled={used}
                onClick={() => {
                  setAddingType(preset.type);
                  setDraft({ target_amount: String(preset.placeholder), target_year: String(CURRENT_YEAR + 5) });
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 text-center transition-all",
                  used
                    ? "border-primary/30 bg-primary/5 opacity-60 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                )}
              >
                <span className="text-2xl">{preset.emoji}</span>
                <p className="text-xs font-semibold text-foreground">{preset.label}</p>
                {used && <span className="text-[10px] text-primary font-bold">Added ✓</span>}
                {!used && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Plus className="h-3 w-3" /> Add
                </span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Inline goal form */}
      {addingType && (
        <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{GOAL_PRESETS.find((g) => g.type === addingType)?.emoji}</span>
            <p className="text-sm font-semibold">
              {GOAL_PRESETS.find((g) => g.type === addingType)?.label}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Amount (₹)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                <Input type="number" className="pl-6 h-9 text-sm"
                  value={draft.target_amount}
                  onChange={(e) => setDraft((d) => ({ ...d, target_amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Year</Label>
              <Input type="number" className="h-9 text-sm"
                min={CURRENT_YEAR + 1} max={2075}
                value={draft.target_year}
                onChange={(e) => setDraft((d) => ({ ...d, target_year: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addGoal} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Goal
            </Button>
            <Button type="button" size="sm" variant="ghost"
              onClick={() => setAddingType(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Skip hint */}
      <p className="text-xs text-muted-foreground text-center">
        No goals yet? That&apos;s fine — click{" "}
        <span className="font-semibold text-foreground">Optimise Our Finances</span>{" "}
        to continue without any goals.
      </p>
    </div>
  );
}