/**
 * LoadingState — consistent AI-processing loader used across all feature pages.
 * Shows an animated pulse with a contextual message.
 */
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Analysing your finances..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-primary/20 animate-ping absolute" />
        <div className="h-16 w-16 rounded-full border-2 border-primary/40 flex items-center justify-center relative">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">Our AI is crunching the numbers…</p>
      </div>
    </div>
  );
}
