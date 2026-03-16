"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Heart, LogOut, ChevronDown, FileText, Calculator } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";

const DEFAULT_NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/features", label: "Features" },
  { href: "/portfolio", label: "My Portfolio" },
  { href: "/about", label: "About" },
  { href: "/tax-information", label: "Tax Information" },
  { href: "/profile", label: "Profile" },
];

const HIDDEN_NAV_HREFS = new Set(["/missionaries", "#explore", "/politics"]);

// Dropdown sub-items keyed by parent href
const NAV_DROPDOWNS: Record<string, { href: string; label: string; sublabel: string; Icon: React.ElementType }[]> = {
  "/tax-information": [
    {
      href: "/tax-information",
      label: "Tax Information",
      sublabel: "Guides, deduction tips, and your receipts",
      Icon: FileText,
    },
    {
      href: "/tools/tax-optimizer",
      label: "Tax Optimizer",
      sublabel: "AI-powered giving strategy for your tax situation",
      Icon: Calculator,
    },
  ],
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [navLinks, setNavLinks] = useState(DEFAULT_NAV_LINKS);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpandedDropdown, setMobileExpandedDropdown] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    (createClient() as any)
      .from("nav_links")
      .select("href, label, sort_order, visible")
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .then(({ data }: any) => {
        if (data && data.length > 0) setNavLinks(data);
      });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadProfile(user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
        else { setProfileName(null); setProfileAvatar(null); }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await (createClient() as any)
      .from("users")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .single();
    if (data?.full_name) setProfileName(data.full_name);
    if (data?.avatar_url) setProfileAvatar(data.avatar_url);
  }

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  function handleMouseEnter(href: string) {
    if (!NAV_DROPDOWNS[href]) return;
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setOpenDropdown(href);
  }

  function handleMouseLeave() {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 120);
  }

  const displayName = profileName || user?.email || null;
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : null;

  return (
    <nav
      className="sticky top-0 z-50 bg-white border-b transition-shadow duration-200"
      style={{
        borderColor: "#f0ede6",
        boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.07)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-display text-lg font-semibold text-gray-900 tracking-tight">
              EasyToGive
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks
              .filter((l) => !HIDDEN_NAV_HREFS.has(l.href))
              .map((link) => {
                const dropdown = NAV_DROPDOWNS[link.href];
                const isActive = pathname === link.href || (dropdown && dropdown.some((d) => pathname === d.href));

                if (dropdown) {
                  return (
                    <div
                      key={link.href}
                      className="relative"
                      onMouseEnter={() => handleMouseEnter(link.href)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        className={`flex items-center gap-1 px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "text-gray-900 bg-gray-100"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        {link.label}
                        <ChevronDown
                          className="w-3.5 h-3.5 transition-transform duration-150"
                          style={{ transform: openDropdown === link.href ? "rotate(180deg)" : "rotate(0deg)" }}
                        />
                      </button>

                      {/* Dropdown panel */}
                      {openDropdown === link.href && (
                        <div
                          className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl border shadow-lg py-1.5 z-50"
                          style={{ borderColor: "#e5e1d8", boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
                          onMouseEnter={() => handleMouseEnter(link.href)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {dropdown.map(({ href, label, sublabel, Icon }) => (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setOpenDropdown(null)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: "#e8f5ee" }}
                              >
                                <Icon className="w-4 h-4" style={{ color: "#1a7a4a" }} />
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${pathname === href ? "text-gray-900" : "text-gray-700"}`}>
                                  {label}
                                </p>
                                <p className="text-xs text-gray-400 leading-snug mt-0.5">{sublabel}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? "text-gray-900 bg-gray-100"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
          </div>

          {/* Desktop auth + CTA */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    {profileAvatar
                      ? <Image src={profileAvatar} alt="" fill sizes="28px" className="object-cover" />
                      : initials}
                  </div>
                  <span className="max-w-[140px] truncate">{displayName}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/get-started"
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  Start Giving
                </Link>
              </>
            )}
          </div>

          {/* Mobile: CTA always visible + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {!user && (
              <Link
                href="/get-started"
                className="px-3.5 py-2 min-h-[44px] rounded-full text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                Start Giving
              </Link>
            )}
            {user && (
              <Link
                href="/profile"
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                {profileAvatar
                  ? <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
                  : initials}
              </Link>
            )}
            <button
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-1" style={{ borderColor: "#f0ede6" }}>
          {navLinks
            .filter((l) => !HIDDEN_NAV_HREFS.has(l.href))
            .map((link) => {
              const dropdown = NAV_DROPDOWNS[link.href];

              if (dropdown) {
                const expanded = mobileExpandedDropdown === link.href;
                return (
                  <div key={link.href}>
                    <button
                      onClick={() => setMobileExpandedDropdown(expanded ? null : link.href)}
                      className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      {link.label}
                      <ChevronDown
                        className="w-4 h-4 transition-transform duration-150"
                        style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>
                    {expanded && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {dropdown.map(({ href, label, Icon }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => { setMobileOpen(false); setMobileExpandedDropdown(null); }}
                            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              pathname === href
                                ? "text-gray-900 bg-gray-100"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#1a7a4a" }} />
                            {label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          <div className="pt-2 border-t space-y-1" style={{ borderColor: "#f0ede6" }}>
            {user ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    {profileAvatar
                      ? <Image src={profileAvatar} alt="" fill sizes="28px" className="object-cover" />
                      : initials}
                  </div>
                  <span className="text-sm text-gray-600 truncate">{displayName}</span>
                </div>
                <button
                  onClick={() => { setMobileOpen(false); handleSignOut(); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
