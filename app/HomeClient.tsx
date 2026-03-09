"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Shield, Search, Star, Heart, CheckCircle, MapPin } from "lucide-react";
import { CATEGORIES } from "@/lib/placeholder-data";
import type { Organization } from "@/lib/placeholder-data";
import OrgCard from "@/components/OrgCard";
import type { OrgDisplaySettings } from "@/components/OrgCard";
import EditableField from "@/components/EditableField";
import { createClient } from "@/lib/supabase-browser";

const CHIP_ALL = { value: "all", label: "All Charities" };
const CHIPS = [
  CHIP_ALL,
  ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

const TESTIMONIALS = [
  {
    quote:
      "I used to send individual checks to eight different charities. EasyToGive let me set up a portfolio and it handles everything — including the tax docs.",
    name: "Margaret H.",
    location: "Cincinnati, OH",
    initials: "MH",
    color: "#1a7a4a",
  },
  {
    quote:
      "As a church administrator, getting listed on EasyToGive brought us 140 new donors in our first month. The verified badge gave people confidence to give.",
    name: "Pastor James R.",
    location: "Memphis, TN",
    initials: "JR",
    color: "#6366f1",
  },
  {
    quote:
      "The portfolio feature is brilliant. I set 30% to animal rescue, 40% to education, 30% to environment — and one monthly transfer covers all of it.",
    name: "Sofia L.",
    location: "Denver, CO",
    initials: "SL",
    color: "#f59e0b",
  },
];

interface SiteSettings {
  hero_headline: string;
  hero_subtext: string;
}

interface Props {
  organizations: Organization[];
  siteSettings?: SiteSettings;
  displaySettingsMap?: Record<string, OrgDisplaySettings>;
}

export default function HomeClient({ organizations, siteSettings, displaySettingsMap }: Props) {
  const [activeChip, setActiveChip] = useState("all");
  const [userCity, setUserCity] = useState<string | null>(null);
  const [localOrgs, setLocalOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    async function loadUserLocation() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await (supabase as any)
        .from("users")
        .select("city, state, lat, lng")
        .eq("id", userData.user.id)
        .single();
      if (!profile?.city && !profile?.lat) return;
      const cityLabel = profile.city ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}` : null;
      setUserCity(cityLabel);
      // Find orgs with matching location (simple string match on city/state)
      if (profile.city) {
        const nearby = organizations.filter((o) =>
          o.location?.toLowerCase().includes(profile.city.toLowerCase()) ||
          (profile.state && o.location?.toLowerCase().includes(profile.state.toLowerCase()))
        ).slice(0, 4);
        setLocalOrgs(nearby);
      }
    }
    loadUserLocation();
  }, [organizations]);

  const visibleOrgs =
    activeChip === "all"
      ? organizations
      : organizations.filter((o) => o.category === activeChip);

  return (
    <div className="bg-white">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 md:pt-10 md:pb-5">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            12,400+ verified organizations
          </div>

          <EditableField
            settingKey="hero_headline"
            value={siteSettings?.hero_headline ?? "Give to what matters most, all at once."}
            as="h1"
            className="font-display text-3xl md:text-4xl font-bold text-gray-900 leading-[1.15] mb-3"
          />

          <EditableField
            settingKey="hero_subtext"
            value={
              siteSettings?.hero_subtext ??
              "Discover verified nonprofits and churches, then donate to multiple causes through a single tax-deductible giving portfolio."
            }
            as="p"
            className="text-base text-gray-500 leading-relaxed mb-5 max-w-lg"
            multiline
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/discover"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Explore Causes
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/portfolio"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-full font-semibold text-sm border transition-all hover:bg-gray-50"
              style={{ color: "#374151", borderColor: "#d1d5db" }}
            >
              Build Portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <section className="border-y" style={{ borderColor: "#f0ede6" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "12,400+", label: "Verified organizations" },
              { value: "$28M+", label: "Donated through EasyToGive" },
              { value: "94,000", label: "Active givers" },
              { value: "100%", label: "Tax-deductible" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-2xl font-bold text-gray-900 mb-0.5">
                  {s.value}
                </div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category chips + org cards ──────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-gray-900">
              Browse causes
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

        {/* Category chips — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" style={{ scrollbarWidth: "none" }}>
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
                    : {
                        backgroundColor: "#f3f4f6",
                        color: "#374151",
                      }
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Org cards */}
        {visibleOrgs.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visibleOrgs.slice(0, 8).map((org) => (
              <OrgCard key={org.id} org={org} displaySettings={displaySettingsMap?.[org.id]} />
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
            Browse all organizations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Local to You ────────────────────────────────────────────── */}
      {localOrgs.length > 0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5" style={{ color: "#1a7a4a" }} />
            <h2 className="font-display text-2xl font-bold text-gray-900">
              Local to You
            </h2>
            {userCity && (
              <span className="text-sm text-gray-500 ml-1">near {userCity}</span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {localOrgs.map((org) => (
              <OrgCard key={org.id} org={org} displaySettings={displaySettingsMap?.[org.id]} />
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="py-20" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-3">
              How EasyToGive works
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

      {/* ── Trust features ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Shield,
              title: "Every org is verified",
              desc: "We confirm IRS 501(c)(3) status, financial transparency, and governance before any organization goes live.",
            },
            {
              icon: Search,
              title: "Discover your cause",
              desc: "Browse thousands of verified nonprofits, churches, and local causes filtered by category and location.",
            },
            {
              icon: Heart,
              title: "One receipt, all tax docs",
              desc: "Get a single consolidated tax receipt for all your donations — no spreadsheet required at year-end.",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "#e8f5ee" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────── */}
      <section className="py-20" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-10 text-center">
            Loved by people who love giving
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl p-6 border"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div className="flex mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-current"
                      style={{ color: "#f59e0b" }}
                    />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-5 text-sm">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div
          className="rounded-3xl px-8 py-16 text-center"
          style={{ backgroundColor: "#e8f5ee" }}
        >
          <h2 className="font-display text-4xl font-bold text-gray-900 mb-3">
            Ready to give smarter?
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Join 94,000 givers who have simplified their charitable giving with
            EasyToGive. It&apos;s free to start.
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
