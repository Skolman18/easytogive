"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Receipt,
  RefreshCw,
  MapPin,
  Heart,
  ChevronDown,
  CheckCircle,
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
    a: "Reach out to us via the About page. We verify every organization before they go live.",
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

function formatRaised(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// ─── Preview card (hero right column) ─────────────────────────────────────────

function PreviewCard({ org }: { org: Organization }) {
  const label = CATEGORY_LABELS[org.category] || org.category;
  return (
    <div
      className="bg-white rounded-2xl border overflow-hidden shadow-xl"
      style={{ borderColor: "#e5e1d8" }}
    >
      <div className="relative h-32 overflow-hidden bg-gray-100">
        <img src={org.imageUrl} alt={org.name} className="w-full h-full object-cover" />
        <div className="absolute top-2.5 left-2.5">
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
          >
            {label}
          </span>
        </div>
        {org.verified && (
          <div className="absolute top-2.5 right-2.5">
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              <CheckCircle className="w-3 h-3" />
              Verified
            </span>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <div className="font-display font-semibold text-gray-900 leading-tight mb-0.5">
          {org.name}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {org.location}
        </div>
        <div className="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
          {org.tagline}
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
  const [activeChip, setActiveChip] = useState("all");
  const [userCity, setUserCity] = useState<string | null>(null);
  const [localOrgs, setLocalOrgs] = useState<Organization[]>([]);
  const [recommendedOrgs, setRecommendedOrgs] = useState<Organization[]>([]);
  const [featuredMissionaries, setFeaturedMissionaries] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Stats count-up
  const statsRef = useRef<HTMLElement>(null);
  const [statsInView, setStatsInView] = useState(false);
  const orgCountAnim = useCountUp(stats.orgCount, 1400, statsInView);
  const raisedAnim = useCountUp(stats.totalRaised, 1600, statsInView);
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

  // Featured missionaries
  useEffect(() => {
    async function loadMissionaries() {
      const supabase = createClient() as any;
      const { data } = await supabase
        .from("missionaries")
        .select("id, slug, full_name, photo_url, bio, mission_org, country, region")
        .eq("status", "approved")
        .eq("visible", true)
        .eq("featured", true)
        .limit(3);
      setFeaturedMissionaries(data || []);
    }
    loadMissionaries();
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

      if (profile.causes?.length > 0) {
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

  const previewOrgs = organizations.slice(0, 3);

  return (
    <div className="bg-white">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 md:pt-20 md:pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Text */}
          <div className="max-w-xl">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 uppercase tracking-wide"
              style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              The Giving Marketplace
            </div>

            <EditableField
              settingKey="hero_headline"
              value={siteSettings?.hero_headline ?? "The Marketplace for Giving."}
              as="h1"
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] mb-5"
            />

            <EditableField
              settingKey="hero_subtext"
              value={
                siteSettings?.hero_subtext ??
                "Discover thousands of verified organizations, build your giving portfolio, and donate to multiple causes with one simple transaction."
              }
              as="p"
              className="text-lg text-gray-500 leading-relaxed mb-8 max-w-[480px]"
              multiline
            />

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                Explore Organizations
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm border transition-all hover:bg-gray-50"
                style={{ color: "#1a7a4a", borderColor: "#1a7a4a" }}
              >
                How It Works
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {[
                { icon: ShieldCheck, label: "Every org is verified" },
                { icon: Receipt, label: "One tax receipt" },
                { icon: RefreshCw, label: "Recurring giving" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#1a7a4a" }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Stacked org card previews */}
          {previewOrgs.length >= 2 && (
            <div className="hidden lg:block relative h-[400px]">
              {/* Back card */}
              {previewOrgs[2] && (
                <div
                  className="absolute bottom-0 right-0 w-72 opacity-60"
                  style={{ transform: "rotate(3deg) translateY(-20px) translateX(12px)" }}
                >
                  <PreviewCard org={previewOrgs[2]} />
                </div>
              )}
              {/* Middle card */}
              <div
                className="absolute bottom-12 left-6 w-72 opacity-85"
                style={{ transform: "rotate(-1.5deg)" }}
              >
                <PreviewCard org={previewOrgs[1]} />
              </div>
              {/* Front card */}
              <div className="absolute top-0 left-0 w-72 z-10">
                <PreviewCard org={previewOrgs[0]} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      <section
        ref={statsRef}
        className="border-b"
        style={{ borderColor: "#f0ede6" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                value: orgCountAnim.toLocaleString(),
                label: "Verified Organizations",
              },
              {
                value: formatRaised(raisedAnim),
                label: "Raised Through EasyToGive",
              },
              {
                value: userCountAnim.toLocaleString(),
                label: "Active Givers",
              },
              {
                value: "100%",
                label: "Tax-Deductible",
              },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  {s.value}
                </div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECOMMENDED FOR YOU ───────────────────────────────────────── */}
      {recommendedOrgs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2">
          <div className="flex items-center gap-2 mb-6">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#e8f5ee" }}
            >
              <Heart className="w-4 h-4" style={{ color: "#1a7a4a" }} />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900">
              Recommended for You
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendedOrgs.map((org) => (
              <OrgCard key={org.id} org={org} displaySettings={displaySettingsMap?.[org.id]} />
            ))}
          </div>
        </section>
      )}

      {/* ── BROWSE ORGANIZATIONS ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-gray-900">
              Browse Organizations
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
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

        {/* Category chips — horizontal scroll */}
        <div
          className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap"
          style={{ scrollbarWidth: "none" }}
        >
          {CHIPS.map((chip) => {
            const active = chip.value === activeChip;
            return (
              <button
                key={chip.value}
                onClick={() => setActiveChip(chip.value)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap"
                style={
                  active
                    ? { backgroundColor: "#1a7a4a", color: "white" }
                    : { backgroundColor: "#f3f4f6", color: "#374151" }
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Org cards */}
        {visibleOrgs.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleOrgs.slice(0, 9).map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                displaySettings={displaySettingsMap?.[org.id]}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400 text-sm">
            No organizations in this category yet.
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border transition-all hover:bg-gray-50"
            style={{ color: "#374151", borderColor: "#d1d5db" }}
          >
            Browse All Organizations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── SUPPORT A MISSIONARY ──────────────────────────────────────── */}
      {featuredMissionaries.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl font-bold text-gray-900">
                Support Missionaries Directly
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                Give one-time or monthly to individuals serving around the world.
              </p>
            </div>
            <Link
              href="/missionaries"
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              style={{ color: "#1a7a4a" }}
            >
              Browse all missionaries →
            </Link>
          </div>
          <div className="space-y-3">
            {featuredMissionaries.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4"
                style={{ borderColor: "#e5e1d8" }}
              >
                {m.photo_url ? (
                  <img
                    src={m.photo_url}
                    alt={m.full_name}
                    className="w-20 h-20 rounded-full object-cover object-top flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-xl font-bold text-white"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    {m.full_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-display font-semibold text-gray-900">{m.full_name}</span>
                    {m.mission_org && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                      >
                        {m.mission_org}
                      </span>
                    )}
                  </div>
                  {(m.country || m.region) && (
                    <p className="text-xs text-gray-500 mb-1">
                      {[m.country, m.region].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {m.bio && (
                    <p className="text-sm text-gray-500 line-clamp-1">{m.bio}</p>
                  )}
                </div>
                <Link
                  href={`/missionaries/${m.slug}?type=monthly`}
                  className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  Give Monthly
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-5 text-center md:hidden">
            <Link
              href="/missionaries"
              className="text-sm font-semibold hover:underline"
              style={{ color: "#1a7a4a" }}
            >
              Browse all missionaries →
            </Link>
          </div>
        </section>
      )}

      {/* ── LOCAL TO YOU ──────────────────────────────────────────────── */}
      {localOrgs.length > 0 && (
        <section className="pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5" style={{ color: "#1a7a4a" }} />
            <h2 className="font-display text-2xl font-bold text-gray-900">
              Local to You
            </h2>
            {userCity && (
              <span className="text-sm text-gray-500 ml-1">near {userCity}</span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {localOrgs.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                displaySettings={displaySettingsMap?.[org.id]}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-20"
        style={{ backgroundColor: "#faf9f6" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-3">
              How EasyToGive Works
            </h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
              Meaningful giving shouldn&apos;t require a spreadsheet.
              Three steps, one receipt.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
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
              <div key={item.step} className="text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5 font-bold text-sm text-white"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  {item.step}
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-gray-900">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Build My Portfolio
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-10">
          <h2 className="font-display text-4xl font-bold text-gray-900 mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-500 text-sm">
            Everything you need to know about EasyToGive.
          </p>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl border overflow-hidden"
                style={{ borderColor: "#e5e1d8" }}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-gray-900 text-sm pr-4">
                    {item.q}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 flex-shrink-0 transition-transform duration-200 text-gray-400"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
                <div
                  style={{
                    maxHeight: isOpen ? "200px" : "0",
                    opacity: isOpen ? 1 : 0,
                  }}
                  className="faq-content"
                >
                  <p className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div
          className="rounded-3xl px-8 py-16 text-center"
          style={{ backgroundColor: "#e8f5ee" }}
        >
          <h2 className="font-display text-4xl font-bold text-gray-900 mb-3">
            Ready to give smarter?
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Join donors who have simplified their charitable giving with EasyToGive.
            It&apos;s free to start.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/get-started"
              className="px-7 py-3 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Get Started Free
            </Link>
            <Link
              href="/discover"
              className="px-7 py-3 rounded-full font-semibold text-sm border bg-white transition-all hover:bg-gray-50"
              style={{ color: "#374151", borderColor: "#d1d5db" }}
            >
              Browse Causes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
