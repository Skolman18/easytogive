"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Heart, ChevronDown } from "lucide-react";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/portfolio", label: "My Portfolio" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ backgroundColor: "#0d1117", borderColor: "#1e2530" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span
              className="font-display text-xl font-semibold tracking-tight text-white"
            >
              EasyToGive
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-white bg-white/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/profile"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/portfolio"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Start Giving
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-400 hover:text-white p-2 rounded-md"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-4 space-y-1"
          style={{ backgroundColor: "#0d1117", borderColor: "#1e2530" }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t" style={{ borderColor: "#1e2530" }}>
            <Link
              href="/portfolio"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Start Giving
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
