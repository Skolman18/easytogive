import Link from "next/link";
import Image from "next/image";
import { Search, Heart, BarChart2, ArrowRight, Mail } from "lucide-react";

export const metadata = {
  title: "About Us — EasyToGive",
  description:
    "EasyToGive is the charitable giving marketplace making it radically easier to discover, give, and track impact across multiple causes.",
};

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">

      {/* ── HERO ── */}
      <section style={{ backgroundColor: "#e8f5ee" }} className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            The Marketplace for Giving
          </h1>
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto">
            We&apos;re building the Amazon of charitable giving — a place where every cause can be
            discovered, every donor can give with confidence, and generosity becomes effortless.
          </p>
        </div>
      </section>

      {/* ── OUR MISSION ── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed text-lg">
            EasyToGive exists to increase charitable giving worldwide by making it radically easier.
            We believe that most people want to give — they just don&apos;t know where to start,
            don&apos;t trust where their money is going, or find the process too complicated.
            We&apos;re changing that. By building a transparent, beautiful, and easy-to-use
            platform, we&apos;re removing every barrier between a generous heart and the causes
            that need it most. Our goal is simple: more giving, to more organizations, by more
            people.
          </p>
        </div>
      </section>

      {/* ── WHY WE EXIST ── */}
      <section className="py-20 px-4" style={{ backgroundColor: "#f0ede6" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-10 text-center">
            Why We Built This
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { stat: "$471 Billion", desc: "given to charity in the US in 2023 alone" },
              { stat: "1.5 Million+", desc: "nonprofits registered in the US" },
              { stat: "1–2 Orgs", desc: "most donors give to their entire life" },
            ].map((item) => (
              <div
                key={item.stat}
                className="bg-white rounded-2xl p-6 text-center border shadow-sm"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div className="font-display text-3xl font-bold mb-2" style={{ color: "#1a7a4a" }}>
                  {item.stat}
                </div>
                <p className="text-sm text-gray-600 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-gray-700 leading-relaxed text-lg max-w-3xl mx-auto text-center">
            We think that last number should be a lot higher. The problem isn&apos;t generosity —
            it&apos;s discovery. Most incredible organizations doing life-changing work are invisible
            to the average donor. EasyToGive changes that.
          </p>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-10 text-center">
            Built by a Giver, for Givers
          </h2>

          <div className="flex flex-col md:flex-row gap-10 items-start">
            {/* Photo */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <Image
                src="/seth-mitzel.jpg"
                alt="Seth Mitzel, Founder & CEO of EasyToGive"
                width={320}
                height={400}
                className="rounded-2xl shadow-md object-cover w-full md:w-80"
                style={{ objectPosition: "top center", height: 280 }}
                sizes="(max-width: 768px) 100vw, 320px"
              />
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#1a7a4a" }}>
                Founder &amp; CEO
              </p>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-5">
                Seth Mitzel
              </h3>
              <p className="text-gray-500 leading-relaxed text-base mb-4">
                Seth built EasyToGive to make generosity effortless. Raised in Bismarck, North
                Dakota, he saw firsthand how hard it was for people to give to multiple organizations
                they loved — writing checks, tracking receipts, managing separate accounts.
                EasyToGive was built to change that.
              </p>
              <p className="text-gray-500 leading-relaxed text-base mb-6">
                His vision is simple: make charitable giving as easy as managing an investment
                portfolio, and bring more resources to the churches, nonprofits, and missionaries
                doing good in the world.
              </p>
              <a
                href="mailto:seth@easytogive.com"
                className="inline-flex items-center gap-1.5 text-sm hover:underline"
                style={{ color: "#1a7a4a" }}
              >
                <Mail className="w-3.5 h-3.5" />
                seth@easytogive.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-4" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                Icon: Search,
                title: "Discover",
                desc: "Browse thousands of verified organizations by cause, location, or impact",
              },
              {
                Icon: Heart,
                title: "Give",
                desc: "Donate one-time or set up recurring giving in seconds",
              },
              {
                Icon: BarChart2,
                title: "Track",
                desc: "Watch your impact grow in your personal giving portfolio",
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#e8f5ee" }}
                >
                  <Icon className="w-7 h-7" style={{ color: "#1a7a4a" }} />
                </div>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR ORGANIZATIONS ── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-5">
            Are You an Organization?
          </h2>
          <p className="text-gray-600 leading-relaxed text-lg mb-8">
            EasyToGive isn&apos;t just for donors. We help nonprofits, churches, and causes of all
            sizes get discovered by new donors, tell their story, and grow their giving base.
            Getting listed is free.
          </p>
          <a
            href="mailto:seth@easytogive.com"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            List Your Organization
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="py-20 px-4" style={{ backgroundColor: "#e8f5ee" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-3">
            Ready to start giving smarter?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            Join thousands of donors building their giving portfolio on EasyToGive.
          </p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Explore Organizations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
