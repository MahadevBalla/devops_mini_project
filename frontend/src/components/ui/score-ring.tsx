/**
 * ScoreRing — animated circular score dial.
 * Used on the Health Score page for the main 0–100 score.
 */
"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  grade: string;
  size?: number;
}

function gradeColor(grade: string): string {
  if (grade === "A" || grade === "A+") return "#16a34a";
  if (grade === "B") return "#7c3aed";
  if (grade === "C") return "#d97706";
  return "#dc2626";
}

export function ScoreRing({ score, grade, size = 160 }: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = gradeColor(grade);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div className="-mt-[calc(160px/2+24px)] text-center" style={{ marginTop: -(size / 2 + 28) }}>
        <p className="text-4xl font-bold" style={{ color }}>
          {Math.round(animatedScore)}
        </p>
        <p className="text-lg font-semibold text-muted-foreground">Grade {grade}</p>
      </div>
    </div>
  );
}
