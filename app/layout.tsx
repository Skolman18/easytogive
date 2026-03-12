import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditModeProvider } from "@/components/EditModeContext";
import EditModeButton from "@/components/EditModeButton";
import LocationPrompt from "@/components/LocationPrompt";
import CookieConsent from "@/components/CookieConsent";
import AdminViewSwitcher from "@/components/AdminViewSwitcher";
import StagingBanner from "@/components/StagingBanner";

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
        <StagingBanner />
        <EditModeProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <EditModeButton />
          <LocationPrompt />
          <CookieConsent />
          <AdminViewSwitcher />
        </EditModeProvider>
      </body>
    </html>
  );
}
