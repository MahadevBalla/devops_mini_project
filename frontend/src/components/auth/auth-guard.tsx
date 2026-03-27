"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/lib/auth";

const PUBLIC_ROUTES = ["/", "/signin", "/signup"];
const AUTH_ROUTES = ["/signin", "/signup"];

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isAuthed = authService.isAuthenticated();
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthPage = AUTH_ROUTES.some((route) => pathname === route);
  const redirectToDashboard = isAuthPage && isAuthed;
  const redirectToSignin = !isPublic && !isAuthed;

  useEffect(() => {
    if (redirectToDashboard) {
      router.replace("/dashboard");
      return;
    }

    if (redirectToSignin) {
      router.replace("/signin");
    }
  }, [redirectToDashboard, redirectToSignin, router]);

  if (redirectToDashboard || redirectToSignin) return null;

  return <>{children}</>;
}
