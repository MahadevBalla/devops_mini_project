// frontend/src/components/life-events/steps/step-event-picker.tsx
"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import {
  EVENT_META,
  type LifeEventType,
  type LifeEventFormState,
} from "@/lib/life-event-types";

interface Props {
  form: LifeEventFormState;
  onChange: (patch: Partial<LifeEventFormState>) => void;
}

const EVENT_ORDER: LifeEventType[] = [
  "bonus", "home_purchase", "marriage",
  "new_baby", "job_loss", "inheritance",
];

export function StepEventPicker({ form, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-foreground">
          What&apos;s happening in your life?
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          We&apos;ll build a personalised financial action plan for your specific situation.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {EVENT_ORDER.map((type) => {
          const meta = EVENT_META[type];
          const isSelected = form.event_type === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ event_type: type })}
              className={cn(
                "relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200",
                "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? meta.colorClass + " shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              )}

              {/* Emoji */}
              <span className="text-2xl mb-2 leading-none">{meta.emoji}</span>

              {/* Label */}
              <p className={cn(
                "text-sm font-semibold leading-tight",
                isSelected ? "text-foreground" : "text-foreground"
              )}>
                {meta.label}
              </p>

              {/* Tagline */}
              <p className={cn(
                "text-[11px] mt-1 leading-tight",
                isSelected ? "text-muted-foreground" : "text-muted-foreground opacity-80"
              )}>
                &ldquo;{meta.tagline}&rdquo;
              </p>

              {/* Crisis badge */}
              {meta.isCrisis && (
                <span className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                  URGENT
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Description of selected event */}
      {form.event_type && (
        <div className={cn(
          "flex items-start gap-3 px-4 py-3 rounded-xl border transition-all",
          EVENT_META[form.event_type].colorClass.replace("border-", "border-").replace("bg-", "bg-")
        )}>
          <span className="text-xl flex-shrink-0">
            {EVENT_META[form.event_type].emoji}
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {EVENT_META[form.event_type].label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {EVENT_META[form.event_type].description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}