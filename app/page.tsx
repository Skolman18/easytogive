import Link from "next/link";
import { ArrowRight, Shield, PieChart, Search, Star, Heart, TrendingUp, CheckCircle } from "lucide-react";
import OrgCard from "@/components/OrgCard";
import { ORGANIZATIONS } from "@/lib/placeholder-data";

const FEATURED_ORGS = ORGANIZATIONS.filter((o) => o.featured);

const STATS = [
  { value: "12,400+", label: "Verified organizations" },
  { value: "$28M+", label: "Donated through EasyToGive" },
  { value: "94,000", label: "Active givers" },
  { value: "100%", label: "Tax-deductible" },
];

const FEATURES = [
  {
    icon: Search,
    title: "Discover Causes You Love",
    description:
      "Browse thousands of verified nonprofits, churches, and local causes filtered by category, location, and impact.",
  },
  {
    icon: PieChart,
    title: "Build a Giving Portfolio",
    description:
      "Allocate your donations across multiple organizations at once — like a diversified investment portfolio, but for good.",
  },
  {
    icon: Shield,
    title: "Every Org Is Verified",
    description:
      "We verify IRS status, financial transparency, and governance standards before any organization appears on EasyToGive.",
  },
  {
    icon: Heart,
    title: "One Receipt, All Tax Docs",
    description:
      "Get a single consolidated tax receipt for all your donations, making year-end giving simple and organized.",
  },
  {
    icon: TrendingUp,
    title: "Track Your Impact",
    description:
      "See how your giving adds up over time — total donated, causes supported, and impact metrics from the orgs you fund.",
  },
  {
    icon: Star,
    title: "Watchlist & Recurring Gifts",
    description:
      "Save organizations you care about, set up automatic monthly giving, and never miss a cause that moves you.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I used to send individual checks to eight different charities. EasyToGive let me set up a portfolio and it handles everything — including the tax docs. Life-changing.",
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
  return (
    <div style={{ backgroundColor: "#faf9f6" }}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #0d1117 0%, #0d2818 50%, #0d1117 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #1a7a4a33 0%, transparent 60%), radial-gradient(circle at 80% 20%, #1a7a4a22 0%, transparent 50%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-green-300 mb-6"
              style={{ backgroundColor: "#1a7a4a33", border: "1px solid #1a7a4a66" }}
            >
              <CheckCircle className="w-4 h-4" />
              12,400+ verified organizations
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
              Give to what
              <br />
              <span style={{ color: "#2db673" }}>matters most</span>
              <br />
              all at once.
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed mb-10 max-w-xl">
              EasyToGive is the charitable giving marketplace where you can discover
              verified nonprofits and churches, then donate to multiple causes through
              a single, tax-deductible giving portfolio.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 text-base"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                Explore Causes
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold transition-all text-base"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                Build Portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ backgroundColor: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="font-display text-3xl md:text-4xl font-bold mb-1"
                  style={{ color: "#2db673" }}
                >
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: "#6b7280" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Organizations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p
              className="text-sm font-semibold uppercase tracking-widest mb-2"
              style={{ color: "#1a7a4a" }}
            >
              Featured This Month
            </p>
            <h2 className="font-display text-4xl font-bold text-gray-900">
              Causes making an impact
            </h2>
          </div>
          <Link
            href="/discover"
            className="hidden md:inline-flex items-center gap-2 text-sm font-semibold hover:underline"
            style={{ color: "#1a7a4a" }}
          >
            View all organizations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_ORGS.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: "#1a7a4a" }}
          >
            View all organizations <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ backgroundColor: "#f0ede6" }} className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p
              className="text-sm font-semibold uppercase tracking-widest mb-2"
              style={{ color: "#1a7a4a" }}
            >
              Simple by design
            </p>
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">
              How EasyToGive works
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Meaningful giving shouldn&apos;t require a spreadsheet. We&apos;ve built a simple
              three-step process to get your generosity flowing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 relative">
            {[
              {
                step: "01",
                title: "Discover causes",
                desc: "Browse our curated directory of verified nonprofits, churches, and local causes by category or search.",
              },
              {
                step: "02",
                title: "Build your portfolio",
                desc: "Choose which organizations you want to support and set the percentage of your donation each receives.",
              },
              {
                step: "03",
                title: "Give with confidence",
                desc: "Complete your donation securely. We distribute funds automatically and send you one tax receipt.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 font-display text-xl font-bold text-white"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-semibold mb-3 text-gray-900">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Build My Portfolio
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-2"
            style={{ color: "#1a7a4a" }}
          >
            Everything you need
          </p>
          <h2 className="font-display text-4xl font-bold text-gray-900">
            Built for the modern giver
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border bg-white card-hover"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: "#e8f5ee" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ backgroundColor: "#f0ede6" }} className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p
              className="text-sm font-semibold uppercase tracking-widest mb-2"
              style={{ color: "#1a7a4a" }}
            >
              Stories from givers
            </p>
            <h2 className="font-display text-4xl font-bold text-gray-900">
              Loved by people who love giving
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="p-7 rounded-2xl bg-white border"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div className="flex mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: "#f59e0b" }} />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 text-sm italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div
          className="rounded-3xl px-8 py-16 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0d1117 0%, #0d2818 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, #1a7a4a 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to give smarter?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
              Join 94,000 givers who have simplified their charitable giving with
              EasyToGive.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/discover"
                className="px-8 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 text-base"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                Get Started Free
              </Link>
              <Link
                href="/discover"
                className="px-8 py-3.5 rounded-xl font-semibold transition-all text-base"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                Browse Causes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
