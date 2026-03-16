import Link from "next/link";
import {
  LayoutDashboard,
  Search,
  FileText,
  Target,
  Repeat,
  Sparkles,
  Building2,
  ShieldCheck,
  BarChart2,
  Newspaper,
  ArrowRight,
  Heart,
  CheckCircle,
} from "lucide-react";

export const metadata = {
  title: "Features — EasyToGive",
  description:
    "Everything EasyToGive offers to donors and organizations — giving portfolios, tax receipts, impact tracking, verified listings, and more.",
};

const DONOR_FEATURES = [
  {
    Icon: LayoutDashboard,
    title: "Giving Portfolio",
    desc: "Manage every organization you give to in one place — just like an investment portfolio. See allocations, adjust percentages, and give to all your causes in a single checkout.",
  },
  {
    Icon: Search,
    title: "Smart Discovery",
    desc: "Search and filter thousands of verified nonprofits, churches, and causes by category, location, or mission. Find organizations you never knew existed.",
  },
  {
    Icon: FileText,
    title: "Automatic Tax Receipts",
    desc: "Every donation generates a tax-compliant receipt. Come April, everything you need is already waiting in your account — no chasing down letters from a dozen organizations.",
  },
  {
    Icon: Target,
    title: "Giving Goals",
    desc: "Set a yearly giving target and track your progress. Research shows people who set giving goals give 3× more. Build the habit with a clear finish line.",
  },
  {
    Icon: Newspaper,
    title: "Impact Feed",
    desc: "See updates directly from the organizations you support. When your money moves the needle, you'll hear about it — not through a generic newsletter, but a personal feed.",
  },
  {
    Icon: Repeat,
    title: "Recurring Giving",
    desc: "Set up monthly giving to any organization in seconds. Consistent, predictable support is what nonprofits need most — and it takes you two clicks to set up.",
  },
];

const ORG_FEATURES = [
  {
    Icon: ShieldCheck,
    title: "Verified Badge",
    desc: "Every organization is reviewed before going live. Our verified badge signals to donors that your organization is legitimate — increasing trust and conversion.",
  },
  {
    Icon: Sparkles,
    title: "AI-Powered Profile",
    desc: "Paste your website URL and our AI fills in your name, mission, location, and tags automatically. Building a compelling profile takes minutes, not hours.",
  },
  {
    Icon: Building2,
    title: "GiveButter Integration",
    desc: "Already on GiveButter? Connect your account and import your organization details, campaign stats, and donor counts directly — no copy-pasting required.",
  },
  {
    Icon: BarChart2,
    title: "Impact Updates",
    desc: "Post updates about what your donations have accomplished. Our team reviews and publishes them to your supporters' feeds, keeping your donors engaged and giving.",
  },
  {
    Icon: FileText,
    title: "Org Dashboard",
    desc: "Manage your profile, post impact updates, and track your giving stats from a single dashboard. No IT department required.",
  },
  {
    Icon: Heart,
    title: "Free to List",
    desc: "Getting your organization on EasyToGive costs nothing. We believe every cause deserves a shot at being discovered, regardless of marketing budget.",
  },
];

const DIFFERENTIATORS = [
  {
    label: "Portfolio-first giving",
    detail: "Most platforms are built around one-time donations to a single org. We're built around your entire giving life.",
  },
  {
    label: "Tax-ready from day one",
    detail: "Receipts are auto-generated and stored. You never have to ask an org for documentation again.",
  },
  {
    label: "Transparent by default",
    detail: "Every org is reviewed. Every impact update is verified. No anonymous listings, no unverified claims.",
  },
  {
    label: "Built for real donors",
    detail: "Not foundations or corporate giving programs — regular people who give $50 or $5,000 a year and want it to count.",
  },
];

export default function FeaturesPage() {
  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">

      {/* ── HERO ── */}
      <section className="py-20 px-4" style={{ backgroundColor: "#e8f5ee" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#1a7a4a" }}>
            What We Offer
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-gray-900 mb-5 leading-tight">
            Giving, made whole
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            EasyToGive isn&apos;t just a donation button. It&apos;s a complete giving platform — for
            donors who want to give intentionally, and for organizations that deserve to be found.
          </p>
        </div>
      </section>

      {/* ── FOR DONORS ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#1a7a4a" }}>For Donors</p>
            <h2 className="font-display text-3xl text-gray-900">Everything a generous person needs</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DONOR_FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border p-6 shadow-sm"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: "#e8f5ee" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                </div>
                <h3 className="font-display text-base text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR ORGANIZATIONS ── */}
      <section className="py-20 px-4" style={{ backgroundColor: "#f0ede6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#1a7a4a" }}>For Organizations</p>
            <h2 className="font-display text-3xl text-gray-900">Tools to grow your donor base</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ORG_FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border p-6 shadow-sm"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: "#e8f5ee" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                </div>
                <h3 className="font-display text-base text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT SETS US APART ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-gray-900 mb-10 text-center">
            What sets us apart
          </h2>
          <div className="space-y-4">
            {DIFFERENTIATORS.map(({ label, detail }) => (
              <div
                key={label}
                className="flex items-start gap-4 p-5 bg-white rounded-2xl border shadow-sm"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <CheckCircle className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DUAL CTA ── */}
      <section className="py-20 px-4" style={{ backgroundColor: "#e8f5ee" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-gray-900 mb-3 text-center">
            Ready to get started?
          </h2>
          <p className="text-gray-600 text-center mb-10">
            Join donors building their giving portfolio — or get your organization in front of them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Start Giving
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup/organization"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full font-semibold text-sm transition-all border hover:bg-white"
              style={{ color: "#1a7a4a", borderColor: "#1a7a4a" }}
            >
              List Your Organization
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
