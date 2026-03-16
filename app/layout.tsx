import type { Metadata, Viewport } from "next";
import type React from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditModeProvider } from "@/components/EditModeContext";
import EditModeButton from "@/components/EditModeButton";
import LocationPrompt from "@/components/LocationPrompt";
import CookieConsent from "@/components/CookieConsent";
import AdminViewSwitcher from "@/components/AdminViewSwitcher";
import StagingBanner from "@/components/StagingBanner";
import ChatWidget from "@/components/ChatWidget";

// ── Env var audit (warns at startup, never crashes) ──────────────────────────
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "GROQ_API_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];
for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.warn(`[EasyToGive] WARNING: Required environment variable ${key} is not set.`);
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "EasyToGive — Charitable Giving, Simplified",
  description:
    "Discover verified nonprofits, churches, and causes. Build your giving portfolio and donate to multiple organizations at once.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:text-white focus:no-underline"
          style={{ backgroundColor: "#1a7a4a" } as React.CSSProperties}
        >
          Skip to main content
        </a>
        <StagingBanner />
        <EditModeProvider>
          <Navbar />
          <main id="main-content" className="min-h-screen">{children}</main>
          <Footer />
          <EditModeButton />
          <LocationPrompt />
          <CookieConsent />
          <AdminViewSwitcher />
          <ChatWidget />
        </EditModeProvider>
      </body>
    </html>
  );
}
