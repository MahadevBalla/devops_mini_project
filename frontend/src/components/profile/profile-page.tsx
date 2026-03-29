"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Palette,
  Briefcase,
} from "lucide-react";
import { authService, type UserResponse } from "@/lib/auth";
import { ApiException } from "@/lib/api";
import {
  getPortfolio,
  isProfileEmpty,
  type PortfolioResponse,
  type UserProfile,
} from "@/lib/portfolio";
import { AppShell } from "@/components/layout";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { Tabs } from "@/components/ui/vercel-tabs";
import { PortfolioSummary } from "./portfolio-summary";
import { PortfolioWizard } from "./portfolio-wizard";
import { ScenarioHistoryTab } from "./scenario-history-tab";
import { PortfolioAnalysisTab } from "./portfolio-analysis-tab";

export function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [activeTab, setActiveTab] = useState("account");
  const [showPortfolioWizard, setShowPortfolioWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (!authService.isAuthenticated()) {
          router.push("/signin");
          return;
        }

        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }

        const [userData, portfolioData] = await Promise.all([
          authService.authenticatedRequest(() => authService.getMe()),
          getPortfolio(),
        ]);

        setUser(userData);
        setPortfolio(portfolioData);
        setShowPortfolioWizard(isProfileEmpty(portfolioData));
      } catch (err) {
        if (err instanceof ApiException && (err.status === 401 || err.status === 400)) {
          authService.logout();
          router.push("/signin");
        } else {
          setError("Failed to load profile details. Please refresh and try again.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  function buildFallbackPortfolio(userId: string, profile: UserProfile): PortfolioResponse {
    return {
      user_id: userId,
      profile,
      fire: {},
      health: {},
      tax: {},
      mf: {},
      couple: {},
      life_event: {},
    };
  }

  function handlePortfolioSaved(updated: UserProfile) {
    setShowPortfolioWizard(false);
    setPortfolio((prev) => {
      if (prev) {
        return { ...prev, profile: updated };
      }
      return buildFallbackPortfolio(user?.id ?? "", updated);
    });
  }

  const tabs = [
    { id: "account", label: "Account" },
    { id: "profile", label: "Financial Profile" },
    { id: "portfolio", label: "Portfolio Analysis" },
    { id: "history",    label: "History" },
    { id: "appearance", label: "Appearance" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {error || "Unable to load your profile. Please sign in again."}
          </p>
          <button
            onClick={() => router.push("/signin")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="bg-card rounded-xl border border-border p-8 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <div className="size-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">{user.full_name}</h1>
              <p className="text-sm text-muted-foreground truncate mt-1">{user.email}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                  {user.is_verified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">Not Verified</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className={`h-4 w-4 ${user.is_active ? "text-green-500" : "text-red-500"}`} />
                  <span className={`text-xs font-medium ${user.is_active ? "text-green-600" : "text-red-600"}`}>
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            Financial Profile
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        <Tabs tabs={tabs} onTabChange={setActiveTab} />

        <div className="mt-5">
          {activeTab === "account" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-background border border-border rounded-xl p-5">
                <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Profile Details
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{user.phone || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border rounded-xl p-5">
                <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Account Details
                </h2>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">User ID</p>
                    <p className="text-xs font-mono font-medium mt-1 break-all">{user.id}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Account Created</p>
                    <p className="text-sm font-medium mt-1">{formatDate(user.created_at)}</p>
                  </div>

                  {user.last_login_at && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Last Login</p>
                      <p className="text-sm font-medium mt-1">{formatDate(user.last_login_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-4">
              {portfolio && !showPortfolioWizard && (
                <div className="bg-background border border-border rounded-xl p-5">
                  <PortfolioSummary
                    portfolio={portfolio}
                    onEdit={() => setShowPortfolioWizard(true)}
                  />
                </div>
              )}

              {(showPortfolioWizard || !portfolio) && (
                <div className="bg-background border border-border rounded-xl p-5">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold">Portfolio Setup</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add your profile once and all planners can prefill values automatically.
                    </p>
                  </div>
                  <PortfolioWizard
                    initialData={(portfolio?.profile as Partial<UserProfile>) || undefined}
                    onSuccess={handlePortfolioSaved}
                    onCancel={() => {
                      if (portfolio && !isProfileEmpty(portfolio)) {
                        setShowPortfolioWizard(false);
                      } else {
                        setActiveTab("account");
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "portfolio" && (
            <PortfolioAnalysisTab />
          )}

          {activeTab === "history" && (
            <ScenarioHistoryTab />
          )}

          {activeTab === "appearance" && (
            <div className="bg-background border border-border rounded-xl p-5">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Appearance
              </h2>
              <div className="flex items-center justify-between py-3 px-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose between light, dark, or system preference.
                  </p>
                </div>
                <ToggleTheme />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}