"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Shield, Search, Star, Heart, CheckCircle } from "lucide-react";
import { ORGANIZATIONS, CATEGORIES } from "@/lib/placeholder-data";
import OrgCard from "@/components/OrgCard";

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

export default function HomePage() {
  const [activeChip, setActiveChip] = useState("all");

  const visibleOrgs =
    activeChip === "all"
      ? ORGANIZATIONS
      : ORGANIZATIONS.filter((o) => o.category === activeChip);

  return (
    <div className="bg-white">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 md:pt-28 md:pb-16">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            12,400+ verified organizations
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-5">
            Give to what<br />
            <span style={{ color: "#1a7a4a" }}>matters most,</span><br />
            all at once.
          </h1>

          <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
            Discover verified nonprofits and churches, then donate to multiple
            causes through a single tax-deductible giving portfolio.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Explore Causes
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border transition-all hover:bg-gray-50"
              style={{ color: "#374151", borderColor: "#d1d5db" }}
            >
              Build Portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <section className="border-y" style={{ borderColor: "#f0ede6" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "12,400+", label: "Verified organizations" },
              { value: "$28M+", label: "Donated through EasyToGive" },
              { value: "94,000", label: "Active givers" },
              { value: "100%", label: "Tax-deductible" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-bold text-gray-900 mb-0.5">
                  {s.value}
                </div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category chips + org cards ──────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
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

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CHIPS.map((chip) => {
            const active = chip.value === activeChip;
            return (
              <button
                key={chip.value}
                onClick={() => setActiveChip(chip.value)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
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
              <OrgCard key={org.id} org={org} />
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
