/**
 * AdvicePanel — renders the AI advice (summary, key actions, risks, disclaimer)
 * Used identically across all 6 feature pages.
 */
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface FinanceAdvice {
  summary: string;
  key_actions: string[];
  risks: string[];
  disclaimer: string;
}

interface AdvicePanelProps {
  advice: FinanceAdvice;
}

export function AdvicePanel({ advice }: AdvicePanelProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <p className="text-sm text-foreground leading-relaxed">{advice.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-semibold">Key actions</h3>
          </div>
          <ul className="space-y-2">
            {advice.key_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Risks to watch</h3>
          </div>
          <ul className="space-y-2">
            {advice.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">{advice.disclaimer}</p>
      </div>
    </div>
  );
}
