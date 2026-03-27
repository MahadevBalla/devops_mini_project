"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import ReactLenis from "lenis/react";
import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ScrollAnimatedTextProps = {
  text: string;
  className?: string;
  charClassName?: string;
};

type CharacterProps = {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
  charClassName?: string;
};


const CharacterV1 = ({
  char,
  index,
  centerIndex,
  scrollYProgress,
  charClassName,
}: CharacterProps) => {
  const isSpace = char === " ";
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);

  return (
    <motion.span
      className={cn("inline-block text-orange-500", isSpace && "w-4", charClassName)}
      style={{ x, rotateX }}
    >
      {char}
    </motion.span>
  );
};

export const ScrollAnimatedText = ({
  text,
  className,
  charClassName,
}: ScrollAnimatedTextProps) => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 85%", "start 45%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setProgress(value);
  });

  const characters = text.split("");
  const centerIndex = Math.floor(characters.length / 2);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <div ref={targetRef} className={cn("inline-block", className)} style={{ perspective: "500px" }}>
      {characters.map((char, index) => {
        const isSpace = char === " ";
        const distanceFromCenter = index - centerIndex;
        const x = (1 - clampedProgress) * distanceFromCenter * 40;
        const rotateX = (1 - clampedProgress) * distanceFromCenter * 30;

        return (
          <span
            key={`${char}-${index}`}
            className={cn("inline-block", isSpace && "w-[0.3em]", charClassName)}
            style={{ transform: `translate3d(${x}px, 0, 0) rotateX(${rotateX}deg)` }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};


const CharacterV2 = ({
  char,
  index,
  centerIndex,
  scrollYProgress,
}: CharacterProps) => {
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.75, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5], [Math.abs(distanceFromCenter) * 50, 0]);

  return (
    <motion.img
      src={char}
      alt=""
      className="h-16 w-16 shrink-0 object-contain will-change-transform"
      style={{ x, scale, y, transformOrigin: "center" }}
    />
  );
};


const CharacterV3 = ({
  char,
  index,
  centerIndex,
  scrollYProgress,
}: CharacterProps) => {
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 90, 0]);
  const rotate = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [-Math.abs(distanceFromCenter) * 20, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.75, 1]);

  return (
    <motion.img
      src={char}
      alt=""
      className="h-16 w-16 shrink-0 object-contain will-change-transform"
      style={{ x, rotate, y, scale, transformOrigin: "center" }}
    />
  );
};

const Skiper31 = () => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const targetRef2 = useRef<HTMLDivElement | null>(null);
  const targetRef3 = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({ target: targetRef });
  const { scrollYProgress: scrollYProgress2 } = useScroll({ target: targetRef2 });
  const { scrollYProgress: scrollYProgress3 } = useScroll({ target: targetRef3 });

  
  const text = "see more from ";
  const characters = text.split("");
  const centerIndex = Math.floor(characters.length / 2);

  
  const macIcon = [
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/discord.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/figma.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/framer.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/github.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/mongodb.svg",
    "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/notion.svg",
    
  ];
  const iconCenterIndex = Math.floor(macIcon.length / 2);

  return (
    <ReactLenis root>
      <main className="w-full bg-white">
        {/* Шапка-подсказка */}
        <div className="top-22 absolute left-1/2 z-10 grid -translate-x-1/2 content-start justify-items-center gap-6 text-center text-black">
          <span className="relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-[#f5f4f3] after:to-black after:content-['']">
            Scroll to see more
          </span>
        </div>

        {/* Блок 1 — текст */}
        <div
          ref={targetRef}
          className="relative box-border flex h-[210vh] items-center justify-center gap-[2vw] overflow-hidden bg-[#f5f4f3] p-[2vw]"
        >
          <div
            className="font-geist w-full max-w-4xl text-center text-6xl font-bold uppercase tracking-tighter text-black"
            style={{ perspective: "500px" }}
          >
            {characters.map((char, index) => (
              <CharacterV1
                key={index}
                char={char}
                index={index}
                centerIndex={centerIndex}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </div>
        </div>

        
        <div
          ref={targetRef2}
          className="relative -mt-[100vh] box-border flex h-[210vh] flex-col items-center justify-center gap-[2vw] overflow-hidden bg-[#f5f4f3] p-[2vw]"
        >
          <p className="font-geist flex items-center justify-center gap-3 text-2xl font-medium tracking-tight text-black">
            <Bracket className="h-12 text-black" />
            <span className="font-geist font-medium">integrate with your fav tech stack</span>
            <Bracket className="h-12 scale-x-[-1] text-black" />
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            {macIcon.map((char, index) => (
              <CharacterV2
                key={index}
                char={char}
                index={index}
                centerIndex={iconCenterIndex}
                scrollYProgress={scrollYProgress2}
              />
            ))}
          </div>
        </div>

        {/* Блок 3 — иконки (вариант с поворотом) */}
        <div
          ref={targetRef3}
          className="relative -mt-[95vh] box-border flex h-[210vh] flex-col items-center justify-center gap-[2vw] overflow-hidden bg-[#f5f4f3] p-[2vw]"
        >
          <p className="font-geist flex items-center justify-center gap-3 text-2xl font-medium tracking-tight text-black">
            <Bracket className="h-12 text-black" />
            <span className="font-geist font-medium">integrate with your fav tech stack</span>
            <Bracket className="h-12 scale-x-[-1] text-black" />
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8" style={{ perspective: "500px" }}>
            {macIcon.map((char, index) => (
              <CharacterV3
                key={index}
                char={char}
                index={index}
                centerIndex={iconCenterIndex}
                scrollYProgress={scrollYProgress3}
              />
            ))}
          </div>
        </div>
      </main>
    </ReactLenis>
  );
};

export { CharacterV1, CharacterV2, CharacterV3, Skiper31 };

const Bracket = ({ className }: { className: string }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 27 78" className={className}>
      <path
        fill="#000"
        d="M26.52 77.21h-5.75c-6.83 0-12.38-5.56-12.38-12.38V48.38C8.39 43.76 4.63 40 .01 40v-4c4.62 0 8.38-3.76 8.38-8.38V12.4C8.38 5.56 13.94 0 20.77 0h5.75v4h-5.75c-4.62 0-8.38 3.76-8.38 8.38V27.6c0 4.34-2.25 8.17-5.64 10.38 3.39 2.21 5.64 6.04 5.64 10.38v16.45c0 4.62 3.76 8.38 8.38 8.38h5.75v4.02Z"
      />
    </svg>
  );
};
