// frontend/src/components/couple-planner/results/joint-roadmap.tsx
import { cn } from "@/lib/utils";

interface Props {
  recommendations: string[];
  nameA: string;
  nameB: string;
}

export function JointRoadmap({ recommendations, nameA, nameB }: Props) {
  if (!recommendations.length) return null;

  const personalise = (s: string) =>
    s.replace(/Partner A/gi, nameA || "Partner A")
     .replace(/Partner B/gi, nameB || "Partner B");

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 bg-muted/40 border-b border-border">
        <p className="text-sm font-bold text-foreground">
          📋 Joint Action Roadmap
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {recommendations.length} steps · Do them in this order
        </p>
      </div>

      <div className="px-5 py-2">
        {recommendations.map((rec, i) => {
          const isLast = i === recommendations.length - 1;
          return (
            <div key={i} className="flex gap-4 py-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {!isLast && (
                  <div className="w-0.5 bg-border flex-1 mt-1" style={{ minHeight: "1.5rem" }} />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5 pb-1">
                <p className="text-sm text-foreground leading-relaxed">
                  {personalise(rec)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}