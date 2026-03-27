// frontend/src/components/ui/animated-number.tsx
"use client";
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface Props {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}

export function AnimatedNumber({ value, format, duration = 1.2 }: Props) {
  const ref    = useRef<HTMLSpanElement>(null);
  const motVal = useMotionValue(0);
  const spring = useSpring(motVal, { duration, bounce: 0 });
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) motVal.set(value);
  }, [inView, value, motVal]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = format ? format(v) : Math.round(v).toLocaleString("en-IN");
      }
    });
    return unsubscribe;
  }, [spring, format]);

  return <span ref={ref}>0</span>;
}