"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Checkbox } from "@/components/ui";
import { Eye, EyeOff, IndianRupee, ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { authService, type UserLogin } from "@/lib/auth";
import { ApiException } from "@/lib/api";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

// ─── Character palette — fintech-tuned ───────────────────────────────────────
// Indigo tall rect | near-black mid rect | teal wide dome | amber tall dome
const C = {
  indigo: "#6366F1",
  slate: "#0F172A",
  teal: "#14B8A6",
  amber: "#F59E0B",
  pupil: "#F8FAFC",   // near-white pupils on dark bodies
  dark: "#0F172A",
} as const;

// ─── Eye primitives (logic unchanged, palette updated) ───────────────────────
interface PupilProps {
  size?: number; maxDistance?: number; pupilColor?: string;
  forceLookX?: number; forceLookY?: number;
}
const Pupil = ({
  size = 12, maxDistance = 5, pupilColor = C.pupil, forceLookX, forceLookY,
}: PupilProps) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  const pos = (() => {
    if (!ref.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = ref.current.getBoundingClientRect();
    const dx = mouse.x - (r.left + r.width / 2);
    const dy = mouse.y - (r.top + r.height / 2);
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const a = Math.atan2(dy, dx);
    return { x: Math.cos(a) * dist, y: Math.sin(a) * dist };
  })();
  return (
    <div ref={ref} className="rounded-full" style={{
      width: size, height: size, backgroundColor: pupilColor,
      transform: `translate(${pos.x}px,${pos.y}px)`,
      transition: "transform 0.1s ease-out",
    }} />
  );
};

interface EyeBallProps {
  size?: number; pupilSize?: number; maxDistance?: number;
  eyeColor?: string; pupilColor?: string; isBlinking?: boolean;
  forceLookX?: number; forceLookY?: number;
}
const EyeBall = ({
  size = 48, pupilSize = 16, maxDistance = 10,
  eyeColor = "rgba(255,255,255,0.92)", pupilColor = C.dark,
  isBlinking = false, forceLookX, forceLookY,
}: EyeBallProps) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  const pos = (() => {
    if (!ref.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = ref.current.getBoundingClientRect();
    const dx = mouse.x - (r.left + r.width / 2);
    const dy = mouse.y - (r.top + r.height / 2);
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const a = Math.atan2(dy, dx);
    return { x: Math.cos(a) * dist, y: Math.sin(a) * dist };
  })();
  return (
    <div ref={ref} className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{ width: size, height: isBlinking ? 2 : size, backgroundColor: eyeColor, overflow: "hidden" }}>
      {!isBlinking && (
        <div className="rounded-full" style={{
          width: pupilSize, height: pupilSize, backgroundColor: pupilColor,
          transform: `translate(${pos.x}px,${pos.y}px)`,
          transition: "transform 0.1s ease-out",
        }} />
      )}
    </div>
  );
};

// ─── AI prompt placeholders shown in left panel ───────────────────────────────
const AI_PROMPTS = [
  "How much tax can I save this year?",
  "When can I retire at this savings rate?",
  "Analyse my mutual fund portfolio",
  "Should I switch to the new tax regime?",
  "What SIP gets me to ₹1Cr in 10 years?",
];

// ─── Component ────────────────────────────────────────────────────────────────
export function AnimatedSignin() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isIndigoBlinking, setIsIndigoBlinking] = useState(false);
  const [isSlateBlinking, setIsSlateBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isIndigoPeeking, setIsIndigoPeeking] = useState(false);

  const indigoRef = useRef<HTMLDivElement>(null);
  const slateRef = useRef<HTMLDivElement>(null);
  const tealRef = useRef<HTMLDivElement>(null);
  const amberRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authService.isAuthenticated()) router.replace("/dashboard");
    else setChecking(false);
  }, [router]);

  useEffect(() => {
    const h = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  // Random blink loops
  useEffect(() => {
    const loop = (set: (v: boolean) => void) => {
      const t = setTimeout(() => {
        set(true);
        setTimeout(() => { set(false); loop(set); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t1 = loop(setIsIndigoBlinking);
    const t2 = loop(setIsSlateBlinking);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    } else setIsLookingAtEachOther(false);
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const t = setTimeout(() => {
        setIsIndigoPeeking(true);
        setTimeout(() => setIsIndigoPeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(t);
    } else setIsIndigoPeeking(false);
  }, [password, showPassword, isIndigoPeeking]);

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const r = ref.current.getBoundingClientRect();
    const dx = mouseX - (r.left + r.width / 2);
    const dy = mouseY - (r.top + r.height / 3);
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };

  const ip = calcPos(indigoRef);
  const sp = calcPos(slateRef);
  const tp = calcPos(tealRef);
  const ap = calcPos(amberRef);

  const hidingPassword = password.length > 0 && !showPassword;
  const showingPassword = password.length > 0 && showPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      await authService.login({ email, password } as UserLogin);
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiException) {
        const code = err.error.code;
        if (code === "EMAIL_NOT_VERIFIED") setError("Please verify your email before signing in.");
        else if (code === "INVALID_CREDENTIALS") setError("Invalid email or password.");
        else setError(err.error.error || "Login failed. Please try again.");
      } else setError("An unexpected error occurred. Please try again.");
    } finally { setIsLoading(false); }
  };

  const handleAiSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  if (checking) return null;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* ── LEFT PANEL — always dark, characters + AI prompt ── */}
      {/*
        Forced dark surface so characters always read clearly.
        Layers: bg-mesh ambient + dot-grid texture + hero-glow bloom + grain noise.
        The `dark` class on this div forces dark variants of child Tailwind utilities.
      */}
      <div
        className="dark relative hidden lg:flex flex-col justify-between p-12 overflow-hidden grain"
        style={{ background: "oklch(0.085 0.018 255)" }}
      >
        {/* Dot grid — dark variant manually applied */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, oklch(0.68 0.22 168 / 0.14) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }} />
        {/* Hero glow from top-left */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 20% -5%, oklch(0.68 0.22 168 / 0.18) 0%, transparent 70%)" }} />
        {/* Secondary ambient — bottom right */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 40% at 85% 90%, oklch(0.72 0.18 198 / 0.10) 0%, transparent 70%)" }} />

        {/* ── Logo ── */}
        <div className="relative z-20 flex items-center gap-2.5 text-lg font-semibold">
          {/* glow-primary = shadow-glow box-shadow ring */}
          <div className="size-9 rounded-xl flex items-center justify-center glow-primary"
            style={{
              background: "var(--primary-subtle)",
              border: "1px solid var(--primary-muted)",
            }}>
            <IndianRupee className="size-4 text-primary" />
          </div>
          {/* text-gradient-hero: foreground→primary→teal gradient */}
          <span
            style={{
              background: `linear-gradient(135deg,
                          var(--foreground) 0%,
                          var(--primary) 60%,
                          oklch(0.62 0.14 198) 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
            className="font-bold">Money Mentor</span>
        </div>

        {/* ── Characters ── */}
        <div className="relative z-20 flex items-end justify-center" style={{ height: "420px" }}>
          <div className="relative" style={{ width: "550px", height: "400px" }}>

            {/* Indigo — tall rectangle */}
            <div
              ref={indigoRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out shadow-(--shadow-glow-sm)"
              style={{
                left: "70px", width: "180px",
                height: (isTyping || hidingPassword) ? "440px" : "400px",
                backgroundColor: C.indigo,
                borderRadius: "10px 10px 0 0", zIndex: 1,
                transform: showingPassword
                  ? "skewX(0deg)"
                  : (isTyping || hidingPassword)
                    ? `skewX(${(ip.bodySkew || 0) - 12}deg) translateX(40px)`
                    : `skewX(${ip.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
                boxShadow: "0 -4px 24px oklch(0.63 0.22 275 / 0.20)",
              }}
            >
              <div className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left: showingPassword ? "20px" : isLookingAtEachOther ? "55px" : `${45 + ip.faceX}px`,
                  top: showingPassword ? "35px" : isLookingAtEachOther ? "65px" : `${40 + ip.faceY}px`,
                }}>
                {[0, 1].map((k) => (
                  <EyeBall key={k} size={18} pupilSize={7} maxDistance={5}
                    eyeColor="rgba(255,255,255,0.92)" pupilColor={C.dark}
                    isBlinking={isIndigoBlinking}
                    forceLookX={showingPassword ? (isIndigoPeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                    forceLookY={showingPassword ? (isIndigoPeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Slate — medium rectangle (was black) */}
            <div
              ref={slateRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out shadow-(--shadow-glow-sm)"
              style={{
                left: "240px", width: "120px", height: "310px",
                backgroundColor: C.slate,
                borderRadius: "8px 8px 0 0", zIndex: 2,
                transform: showingPassword
                  ? "skewX(0deg)"
                  : isLookingAtEachOther
                    ? `skewX(${(sp.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                    : (isTyping || hidingPassword)
                      ? `skewX(${(sp.bodySkew || 0) * 1.5}deg)`
                      : `skewX(${sp.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
                border: "1px solid oklch(1 0 0 / 0.08)",
              }}
            >
              <div className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left: showingPassword ? "10px" : isLookingAtEachOther ? "32px" : `${26 + sp.faceX}px`,
                  top: showingPassword ? "28px" : isLookingAtEachOther ? "12px" : `${32 + sp.faceY}px`,
                }}>
                {[0, 1].map((k) => (
                  <EyeBall key={k} size={16} pupilSize={6} maxDistance={4}
                    eyeColor="rgba(255,255,255,0.90)" pupilColor={C.dark}
                    isBlinking={isSlateBlinking}
                    forceLookX={showingPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
                    forceLookY={showingPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Teal — wide dome (was orange) */}
            <div
              ref={tealRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out shadow-(--shadow-glow-sm)"
              style={{
                left: "0px", width: "240px", height: "200px",
                backgroundColor: C.teal,
                borderRadius: "120px 120px 0 0", zIndex: 3,
                transform: showingPassword ? "skewX(0deg)" : `skewX(${tp.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
                boxShadow: "0 -4px 32px oklch(0.68 0.22 168 / 0.28)",
              }}
            >
              <div className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left: showingPassword ? "50px" : `${82 + (tp.faceX || 0)}px`,
                  top: showingPassword ? "85px" : `${90 + (tp.faceY || 0)}px`,
                }}>
                {[0, 1].map((k) => (
                  <Pupil key={k} size={12} maxDistance={5} pupilColor={C.dark}
                    forceLookX={showingPassword ? -5 : undefined}
                    forceLookY={showingPassword ? -4 : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Amber — tall dome (was yellow) */}
            <div
              ref={amberRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out shadow-(--shadow-glow-sm)"
              style={{
                left: "310px", width: "140px", height: "230px",
                backgroundColor: C.amber,
                borderRadius: "70px 70px 0 0", zIndex: 4,
                transform: showingPassword ? "skewX(0deg)" : `skewX(${ap.bodySkew || 0}deg)`,
                transformOrigin: "bottom center",
                boxShadow: "0 -4px 24px oklch(0.78 0.16 78 / 0.22)",
              }}
            >
              <div className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: showingPassword ? "20px" : `${52 + (ap.faceX || 0)}px`,
                  top: showingPassword ? "35px" : `${40 + (ap.faceY || 0)}px`,
                }}>
                {[0, 1].map((k) => (
                  <Pupil key={k} size={12} maxDistance={5} pupilColor={C.dark}
                    forceLookX={showingPassword ? -5 : undefined}
                    forceLookY={showingPassword ? -4 : undefined}
                  />
                ))}
              </div>
              {/* Smile */}
              <div className="absolute rounded-full transition-all duration-200 ease-out"
                style={{
                  width: "80px", height: "4px", backgroundColor: C.dark,
                  left: showingPassword ? "10px" : `${40 + (ap.faceX || 0)}px`,
                  top: showingPassword ? "88px" : `${88 + (ap.faceY || 0)}px`,
                }} />
            </div>
          </div>
        </div>

        {/* ── AI prompt teaser ── */}
        <div className="relative z-20 space-y-3">
          {/* text-eyebrow = 0.75rem uppercase, tracking, color:primary */}
          <p className="text-eyebrow text-center">Ask our AI anything</p>
          <PlaceholdersAndVanishInput
            placeholders={AI_PROMPTS}
            onChange={() => { }}
            onSubmit={handleAiSubmit}
          />
          <p className="text-center text-[11px] text-white/40">
            Sign in to get personalised answers →
          </p>
        </div>

        {/* ── Footer links ── */}
        <div className="relative z-20 flex items-center gap-8 text-sm text-white/40">
          {["Privacy Policy", "Terms of Service", "Contact"].map((l) => (
            <a key={l} href="#" className="hover:text-white/70 transition-colors">{l}</a>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — form, theme-adaptive ── */}
      <div className="relative flex items-center justify-center p-8 bg-background overflow-hidden">
        {/* Subtle dot-grid-fine texture */}
        <div className="absolute inset-0 dot-grid-fine opacity-40 pointer-events-none" />
        {/* Ambient hero glow from top right */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 40% at 80% -5%, var(--primary-subtle) 0%, transparent 70%)" }} />

        <div className="relative w-full max-w-105 z-10">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
            <div className="size-8 rounded-lg flex items-center justify-center glow-primary"
              style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary-muted)" }}>
              <IndianRupee className="size-4 text-primary" />
            </div>
            <span className="text-foreground font-bold">Money Mentor</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            {/* text-eyebrow */}
            <p className="text-eyebrow mb-2">Sign in</p>
            {/* text-display-sm: clamp(1.8rem, 3.5vw, 2.8rem) tight tracking */}
            <h1
              style={{
                background: `linear-gradient(135deg,
                          var(--foreground) 0%,
                          var(--primary) 60%,
                          oklch(0.62 0.14 198) 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
              className="text-display-sm">Welcome !</h1>
            <p className="text-muted-foreground text-sm mt-1.5">Enter your credentials to continue</p>
          </div>

          {/* ── Form card ── */}
          {/*
            card-elevated = bg-surface-2 + shadow-md + border-subtle
            Wraps the form group for visual grouping without a heavy box.
          */}
          <div className="card-elevated rounded-2xl p-6 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email
                </Label>
                {/* surface-inset: sunken input feel */}
                <div className="surface-inset rounded-xl px-3.5 h-12 flex items-center gap-2.5
                  border border-border-subtle focus-within:border-primary focus-within:ring-1
                  focus-within:ring-primary/30 transition-all duration-150">
                  <Input
                    id="email" type="email" placeholder="your@email.com"
                    value={email} autoComplete="off"
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    required
                    className="flex-1 h-full bg-transparent border-none shadow-none
                      focus-visible:ring-0 focus-visible:ring-offset-0 text-sm p-0"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Password
                </Label>
                <div className="surface-inset rounded-xl px-3.5 h-12 flex items-center gap-2.5
                  border border-border-subtle focus-within:border-primary focus-within:ring-1
                  focus-within:ring-primary/30 transition-all duration-150">
                  <Input
                    id="password" type={showPassword ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex-1 h-full bg-transparent border-none shadow-none
                      focus-visible:ring-0 focus-visible:ring-offset-0 text-sm p-0"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-xs font-normal cursor-pointer text-muted-foreground">
                    Remember for 30 days
                  </Label>
                </div>
                <a href="#" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </a>
              </div>

              {/* Error — badge-destructive pattern */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl text-sm
                  badge-destructive border">
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Submit — glow-primary */}
              <button
                type="submit" disabled={isLoading}
                className="w-full h-12 rounded-xl text-sm font-semibold
                  bg-primary text-primary-foreground glow-primary
                  hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 transition-all duration-200"
              >
                {isLoading ? "Signing in…" : (
                  <><span>Sign in</span><ArrowRight className="size-4" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            {/* <div className="flex items-center gap-3">
              <div className="flex-1 divider-gradient" />
              <span className="text-[11px] text-muted-foreground">or continue with</span>
              <div className="flex-1 divider-gradient" />
            </div> */}

            {/* Google — glass button */}
            {/* <button type="button"
              className="w-full h-11 rounded-xl text-sm font-medium glass
                flex items-center justify-center gap-2.5
                hover:bg-primary-subtle transition-all duration-200 text-foreground">
              <Mail className="size-4" />
              Sign in with Google
            </button> */}
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
