import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider as MUIThemeProvider } from "@mui/material/styles";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Bricolage_Grotesque } from "next/font/google";
import { LenisProvider } from "@/components/layout/lenis-provider";
import theme from "@/theme";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Money Mentor",
    template: "%s | Money Mentor",
  },
  description:
    "Your personal AI financial mentor - track expenses, manage budgets, and achieve your financial goals with intelligent insights.",
  keywords: [
    "finance",
    "money management",
    "budgeting",
    "expenses",
    "personal finance",
    "AI mentor",
  ],
  authors: [{ name: "Money Mentor Team" }],
  creator: "Money Mentor",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Money Mentor - Your AI Financial Companion",
    description:
      "Transform your financial future with AI-powered budgeting, expense tracking, and personalized financial guidance.",
    siteName: "Money Mentor",
  },
  twitter: {
    card: "summary_large_image",
    title: "Money Mentor - Your AI Financial Companion",
    description:
      "Transform your financial future with AI-powered budgeting, expense tracking, and personalized financial guidance.",
    creator: "@moneymentor",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={bricolage.variable}
      suppressHydrationWarning
    >
      <body className={bricolage.className}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <MUIThemeProvider theme={theme}>
              <LenisProvider>
                <Toaster richColors position="bottom-right" />
                {children}
              </LenisProvider>
            </MUIThemeProvider>
          </AppRouterCacheProvider>
        </NextThemesProvider>
      </body>
    </html>
  );
}
