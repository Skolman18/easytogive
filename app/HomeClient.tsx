"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  Receipt,
  RefreshCw,
  MapPin,
  Heart,
  ChevronDown,
  CheckCircle,
  Search,
} from "lucide-react";
import { CATEGORIES, CAUSE_TO_CATEGORY, CATEGORY_LABELS } from "@/lib/categories";
import type { Organization } from "@/lib/placeholder-data";
import OrgCard from "@/components/OrgCard";
import type { OrgDisplaySettings } from "@/components/OrgCard";
import EditableField from "@/components/EditableField";
import { createClient } from "@/lib/supabase-browser";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CHIP_ALL = { value: "all", label: "All Charities" };
const CHIPS = [
  CHIP_ALL,
  ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

const FAQ_ITEMS = [
  {
    q: "What is EasyToGive?",
    a: "EasyToGive is a charitable giving marketplace where you can discover verified nonprofits, churches, and causes, then donate to multiple organizations through a single giving portfolio.",
  },
  {
    q: "Is my donation tax-deductible?",
    a: "Yes. Every organization on EasyToGive is a verified 501(c)(3) nonprofit. You'll receive one consolidated tax receipt for all your donations.",
  },
  {
    q: "How does the giving portfolio work?",
    a: "You add organizations to your portfolio and set the percentage each receives. When you donate, we split and distribute the funds automatically.",
  },
  {
    q: "Is it free to use EasyToGive?",
    a: "Completely free for donors to sign up and use.",
  },
  {
    q: "How do I get my organization listed?",
    a: "Apply via the nonprofit signup page. We verify every organization before they go live on the platform.",
  },
  {
    q: "Can I set up recurring donations?",
    a: "Yes — weekly, bi-weekly, monthly, or yearly from any org page or your portfolio.",
  },
];

// ─── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(end: number, duration = 1400, active = false): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || end === 0) return;
    let startTime: number | null = null;
    let rafId: number;
    function step(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [end, duration, active]);
  return value;
}

// ─── Portfolio Preview Card (hero visual) ──────────────────────────────────────

function PortfolioPreviewCard() {
  const allocations = [
    { name: "Hope Food Bank", pct: 60, color: "#1a7a4a" },
    { name: "City Arts Center", pct: 25, color: "#2d9d61" },
    { name: "Local Animal Shelter", pct: 15, color: "#4cb87e" },
  ];

  return (
    <div className="relative max-w-sm ml-auto">
      {/* Depth shadow card */}
      <div
        className="absolute rounded-2xl border"
        style={{
          inset: 0,
          bottom: "-10px",
          right: "-10px",
          backgroundColor: "#f0fdf4",
          borderColor: "#bbf7d0",
          zIndex: 0,
        }}
      />
      {/* Main card */}
      <div
        className="relative rounded-2xl border bg-white p-6 z-10"
        style={{
          borderColor: "#e8e5de",
          boxShadow: "0 20px 60px rgba(0,0,0,0.07), 0 4px 16px rgba(26,122,74,0.06)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div
              className="text-[10px] font-semibold tracking-widest uppercase mb-0.5"
              style={{ color: "#9b9990" }}
            >
              My Giving Portfolio
            </div>
            <div className="font-display text-xl text-gray-900">Sarah M.</div>
            <div className="text-xs mt-0.5" style={{ color: "#9b9990" }}>
              Member since 2023
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[10px] font-semibold tracking-widest uppercase mb-0.5"
              style={{ color: "#9b9990" }}
            >
              Monthly
            </div>
            <div className="font-display text-xl" style={{ color: "#1a7a4a" }}>
              $150
            </div>
          </div>
        </div>

        {/* Allocation bars */}
        <div className="space-y-3 mb-5">
          {allocations.map((a) => (
            <div key={a.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium" style={{ color: "#5c5b56" }}>
                  {a.name}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: a.color }}
                >
                  {a.pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ backgroundColor: "#f0ede6" }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${a.pct}%`, backgroundColor: a.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="section-divider mb-4" />

        {/* Total + link */}
        <div className="flex items-end justify-between">
          <div>
            <div
              className="text-[10px] font-semibold tracking-widest uppercase mb-1"
              style={{ color: "#9b9990" }}
            >
              Total given this year
            </div>
            <div className="font-display text-4xl text-gray-900">$1,847</div>
          </div>
          <Link
            href="/portfolio"
            className="text-xs font-semibold flex items-center gap-1 hover:underline"
            style={{ color: "#1a7a4a" }}
          >
            View portfolio
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SiteSettings {
  hero_headline: string;
  hero_subtext: string;
}

interface Stats {
  orgCount: number;
  totalRaised: number;
  userCount: number;
}

interface Props {
  organizations: Organization[];
  siteSettings?: SiteSettings;
  displaySettingsMap?: Record<string, OrgDisplaySettings>;
  stats?: Stats;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function HomeClient({
  organizations,
  siteSettings,
  displaySettingsMap,
  stats = { orgCount: 0, totalRaised: 0, userCount: 0 },
}: Props) {
  const router = useRouter();
  const [activeChip, setActiveChip] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userCity, setUserCity] = useState<string | null>(null);
  const [localOrgs, setLocalOrgs] = useState<Organization[]>([]);
  const [recommendedOrgs, setRecommendedOrgs] = useState<Organization[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Stats count-up
  const statsRef = useRef<HTMLElement>(null);
  const [statsInView, setStatsInView] = useState(false);
  const orgCountAnim = useCountUp(stats.orgCount, 1400, statsInView);
  const userCountAnim = useCountUp(stats.userCount, 1200, statsInView);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setStatsInView(true); obs.disconnect(); }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // User data (recommendations + local)
  useEffect(() => {
    async function loadUserData() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await (supabase as any)
        .from("users")
        .select("city, state, lat, lng, causes")
        .eq("id", userData.user.id)
        .single();
      if (!profile) return;

      if (profile.city) {
        const cityLabel = `${profile.city}${profile.state ? `, ${profile.state}` : ""}`;
        setUserCity(cityLabel);
        const nearby = organizations
          .filter(
            (o) =>
              o.location?.toLowerCase().includes(profile.city.toLowerCase()) ||
              (profile.state && o.location?.toLowerCase().includes(profile.state.toLowerCase()))
          )
          .slice(0, 4);
        setLocalOrgs(nearby);
      }

      if (Array.isArray(profile.causes) && profile.causes.length > 0) {
        const matchedCategories = new Set<string>(
          (profile.causes as string[]).map((c) => CAUSE_TO_CATEGORY[c]).filter(Boolean)
        );
        const recommended = organizations
          .filter((o) => matchedCategories.has(o.category))
          .slice(0, 4);
        setRecommendedOrgs(recommended);
      }
    }
    loadUserData();
  }, [organizations]);

  const visibleOrgs =
    activeChip === "all"
      ? organizations
      : organizations.filter((o) => o.category === activeChip);

  return (
    <div className="bg-white">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 md:pt-20 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">

          {/* Left: Text */}
          <div className="max-w-xl">
            {/* Warm trust badge */}
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium mb-5 md:mb-7"
              style={{ backgroundColor: "#f5ede0", color: "#c47c2a" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#1a7a4a" }}
              />
              Trusted giving — verified nonprofits only
            </div>

            <EditableField
              settingKey="hero_headline"
              value={siteSettings?.hero_headline ?? "Give with purpose.\nGive with confidence."}
              as="h1"
              className="font-display text-[32px] md:text-[52px] lg:text-[62px] text-gray-900 leading-[1.08] mb-5 md:mb-7 tracking-tight"
            />

            <EditableField
              settingKey="hero_subtext"
              value={
                siteSettings?.hero_subtext ??
                "Discover verified organizations you trust, build your giving portfolio, and manage every donation in one place. Free for donors, forever."
              }
              as="p"
              className="text-[15px] md:text-lg leading-relaxed mb-7 md:mb-9 max-w-[480px]"
              style={{ color: "#5c5b56" } as any}
              multiline
            />

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-7 md:mb-9">
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                Start giving free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/signup/organization"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full font-semibold text-sm border transition-colors hover:bg-gray-50"
                style={{ color: "#1a7a4a", borderColor: "#1a7a4a" }}
              >
                List your organization
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {[
                "Free for donors",
                "1% platform fee",
                "Every org verified",
              ].map((label) => (
                <div key={label} className="flex items-center gap-1.5">
                  <CheckCircle
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: "#1a7a4a" }}
                  />
                  <span className="text-sm" style={{ color: "#5c5b56" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Portfolio preview card */}
          <div className="hidden lg:block">
            <PortfolioPreviewCard />
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      {stats.orgCount > 0 && (
        <section
          ref={statsRef}
          className="border-y"
          style={{ borderColor: "#e8e5de", backgroundColor: "#faf9f6" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-12">
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 md:gap-x-20">
              {[
                { value: `${orgCountAnim.toLocaleString()}+`, label: "Verified Organizations" },
                stats.userCount > 0
                  ? { value: userCountAnim.toLocaleString(), label: "Active Givers" }
                  : null,
                { value: "100%", label: "Tax-Deductible Giving" },
              ]
                .filter(Boolean)
                .map((s) => (
                  <div key={s!.label} className="text-center">
                    <div className="font-display text-3xl md:text-5xl text-gray-900 mb-1">
                      {s!.value}
                    </div>
                    <div
                      className="text-xs md:text-sm font-medium tracking-wide"
                      style={{ color: "#9b9990" }}
                    >
                      {s!.label}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RECOMMENDED FOR YOU ───────────────────────────────────────── */}
      {recommendedOrgs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16 pb-2">
          <div className="flex items-center gap-2.5 mb-5 md:mb-8">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#e8f5ee" }}
            >
              <Heart className="w-4 h-4" style={{ color: "#1a7a4a" }} />
            </div>
            <h2 className="font-display text-xl md:text-3xl text-gray-900">
              Recommended for You
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-5">
            {recommendedOrgs.map((org) => (
              <OrgCard key={org.id} org={org} displaySettings={displaySettingsMap?.[org.id]} />
            ))}
          </div>
        </section>
      )}

      {/* ── BROWSE ORGANIZATIONS ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <div className="flex items-end justify-between mb-5 md:mb-9">
          <div>
            <h2 className="font-display text-xl md:text-3xl text-gray-900">
              Browse Organizations
            </h2>
            <p className="mt-1 text-sm" style={{ color: "#9b9990" }}>
              Every organization is verified for transparency and impact.
            </p>
          </div>
          <Link
            href="/discover"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: "#1a7a4a" }}
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) router.push(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
            else router.push("/discover");
          }}
          className="relative mb-5 max-w-xl"
        >
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "#9b9990" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations, causes, or locations…"
            className="w-full pl-11 pr-28 py-3 rounded-full border text-sm"
            style={{ borderColor: "#e8e5de" }}
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Search
          </button>
        </form>

        {/* Category chips */}
        <div
          className="flex gap-2 overflow-x-auto pb-2 mb-5 md:mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap"
          style={{ scrollbarWidth: "none" }}
        >
          {CHIPS.map((chip) => {
            const active = chip.value === activeChip;
            return (
              <button
                key={chip.value}
                onClick={() => setActiveChip(chip.value)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap"
                style={
                  active
                    ? { backgroundColor: "#1a7a4a", color: "white" }
                    : { backgroundColor: "#f0ede6", color: "#5c5b56" }
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Org cards */}
        {visibleOrgs.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-5">
            {visibleOrgs.slice(0, 9).map((org) => (
              <OrgCard key={org.id} org={org} displaySettings={displaySettingsMap?.[org.id]} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-sm" style={{ color: "#9b9990" }}>
            No organizations in this category yet.
          </div>
        )}

        <div className="mt-8 md:mt-12 text-center">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border transition-colors hover:bg-gray-50"
            style={{ color: "#5c5b56", borderColor: "#e8e5de" }}
          >
            Browse All Organizations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── LOCAL TO YOU ──────────────────────────────────────────────── */}
      {localOrgs.length > 0 && (
        <section className="pb-8 md:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 mb-5 md:mb-8">
            <MapPin className="w-5 h-5" style={{ color: "#1a7a4a" }} />
            <h2 className="font-display text-xl md:text-3xl text-gray-900">
              Local to You
            </h2>
            {userCity && (
              <span className="text-sm ml-1" style={{ color: "#9b9990" }}>
                near {userCity}
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-5">
            {localOrgs.map((org) => (
              <OrgCard key={org.id} org={org} displaySettings={displaySettingsMap?.[org.id]} />
            ))}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-12 md:py-24"
        style={{ backgroundColor: "#faf9f6" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-18">
            <h2 className="font-display text-2xl md:text-5xl text-gray-900 mb-3">
              How EasyToGive Works
            </h2>
            <p className="max-w-md mx-auto text-sm md:text-base leading-relaxed" style={{ color: "#9b9990" }}>
              Meaningful giving should not require a spreadsheet.
              Three steps, one receipt.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                step: "01",
                title: "Discover causes",
                desc: "Browse verified nonprofits, churches, and local causes by category, location, or search.",
              },
              {
                step: "02",
                title: "Build your portfolio",
                desc: "Choose organizations and set the percentage of your donation each receives.",
              },
              {
                step: "03",
                title: "Give with confidence",
                desc: "Donate securely. We distribute funds and send one consolidated tax receipt.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center md:text-left">
                {/* Large decorative step number */}
                <div
                  className="font-display text-7xl md:text-8xl leading-none mb-2 select-none"
                  style={{ color: "#e8f5ee" }}
                >
                  {item.step}
                </div>
                <h3 className="font-display text-xl md:text-2xl text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "#9b9990" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10 md:mt-16">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Build My Portfolio
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-2xl md:text-5xl text-gray-900 mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-sm" style={{ color: "#9b9990" }}>
            Everything you need to know about EasyToGive.
          </p>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="bg-white rounded-xl border overflow-hidden"
                style={{ borderColor: "#e8e5de" }}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900 text-sm pr-4">
                    {item.q}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                    style={{
                      color: "#9b9990",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                <div
                  style={{ maxHeight: isOpen ? "200px" : "0", opacity: isOpen ? 1 : 0 }}
                  className="faq-content"
                >
                  <p className="px-6 pb-4 text-sm leading-relaxed" style={{ color: "#5c5b56" }}>
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA — dark green ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-24">
        <div
          className="rounded-2xl md:rounded-3xl px-6 py-12 md:px-12 md:py-20 text-center"
          style={{ backgroundColor: "#1a7a4a" }}
        >
          <h2 className="font-display text-2xl md:text-5xl text-white mb-3 md:mb-4">
            Start making your giving count.
          </h2>
          <p
            className="mb-8 md:mb-10 max-w-md mx-auto text-sm md:text-base leading-relaxed"
            style={{ color: "#86efac" }}
          >
            Start your giving portfolio in 2 minutes. Free forever — no fees for donors.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/get-started"
              className="px-7 py-3.5 rounded-full font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "white", color: "#1a7a4a" }}
            >
              Build My Portfolio
            </Link>
            <Link
              href="/discover"
              className="px-7 py-3.5 rounded-full font-semibold text-sm border transition-colors hover:bg-white/10"
              style={{ color: "white", borderColor: "rgba(255,255,255,0.35)" }}
            >
              Explore Organizations
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
