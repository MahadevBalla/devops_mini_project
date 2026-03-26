/**
 * ResultCard — shared card wrapper for all feature result sections
 */
import { cn } from "@/lib/utils";

interface ResultCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ResultCard({ children, className }: ResultCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
