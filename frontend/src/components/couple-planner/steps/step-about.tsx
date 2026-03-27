// frontend/src/components/couple-planner/steps/step-about.tsx
"use client";

import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { cn }     from "@/lib/utils";
import type { CoupleFormState } from "@/lib/couple-types";

interface Props {
  form: CoupleFormState;
  onChange: (patch: Partial<CoupleFormState>) => void;
}

type Relationship = CoupleFormState["relationship"];

const RELATIONSHIP_OPTIONS: {
  value: Relationship; emoji: string; label: string; sub: string;
}[] = [
  { value: "married",        emoji: "💍", label: "Married",         sub: "Legally married couple"     },
  { value: "living_together",emoji: "🏠", label: "Living Together", sub: "Committed, sharing expenses" },
  { value: "planning",       emoji: "💑", label: "Planning Ahead",  sub: "Not yet living together"    },
];

export function StepAbout({ form, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-foreground">
          Tell us about yourselves
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Names are optional — they personalise your results. We never store them.
        </p>
      </div>

      {/* Names */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Your name <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
          <Input
            placeholder="e.g. Rohan"
            value={form.name_a}
            onChange={(e) => onChange({ name_a: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Partner&apos;s name <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
          <Input
            placeholder="e.g. Priya"
            value={form.name_b}
            onChange={(e) => onChange({ name_b: e.target.value })}
          />
        </div>
      </div>

      {/* Relationship status */}
      <div className="space-y-2">
        <Label>Relationship status</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {RELATIONSHIP_OPTIONS.map((opt) => {
            const sel = form.relationship === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ relationship: opt.value })}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  sel
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <span className="text-2xl flex-shrink-0 leading-none mt-0.5">
                  {opt.emoji}
                </span>
                <div>
                  <p className={cn(
                    "text-sm font-semibold",
                    sel ? "text-primary" : "text-foreground"
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {opt.sub}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
        <span className="text-2xl">
          {RELATIONSHIP_OPTIONS.find((o) => o.value === form.relationship)?.emoji}
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">
            {form.name_a || "Partner A"} &amp; {form.name_b || "Partner B"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Joint plan will be personalised with these names in all results.
          </p>
        </div>
      </div>
    </div>
  );
}