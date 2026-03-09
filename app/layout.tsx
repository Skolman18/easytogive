import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditModeProvider } from "@/components/EditModeContext";
import EditModeButton from "@/components/EditModeButton";
import LocationPrompt from "@/components/LocationPrompt";

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
        <EditModeProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <EditModeButton />
          <LocationPrompt />
        </EditModeProvider>
      </body>
    </html>
  );
}
