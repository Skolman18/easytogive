import Link from "next/link";
import { Users, BadgeCheck, Banknote, BarChart2 } from "lucide-react";

export default function ForNonprofitsPage() {
  const benefits = [
    {
      icon: Users,
      title: "Expand your donor base",
      description:
        "Get in front of 94,000+ active givers who are specifically looking to support verified nonprofits. EasyToGive donors are motivated, recurring, and mission-aligned.",
    },
    {
      icon: BadgeCheck,
      title: "Build credibility with a verified badge",
      description:
        "Our verification process signals to donors that your organization is legitimate, tax-exempt, and accountable — increasing trust and conversion.",
    },
    {
      icon: Banknote,
      title: "Receive consolidated payments",
      description:
        "No more processing dozens of small transactions. We aggregate all donations to your organization and send a single monthly ACH transfer directly to your bank.",
    },
    {
      icon: BarChart2,
      title: "Access donor analytics",
      description:
        "Understand where your donors are coming from, which campaigns are driving growth, and how your giving portfolio share changes over time.",
    },
  ];

  const stats = [
    { value: "12,400+", label: "Verified organizations" },
    { value: "$28M+", label: "Distributed to nonprofits" },
    { value: "94,000", label: "Active givers" },
    { value: "100%", label: "Tax-deductible donations" },
  ];

  const timelineSteps = [
    {
      step: "01",
      title: "Submit your application",
      description:
        "Complete our online form with your organization's name, EIN, mission statement, and 501(c)(3) determination letter.",
    },
    {
      step: "02",
      title: "We review in 2 business days",
      description:
        "Our team verifies your tax-exempt status against IRS records and reviews your application. You'll receive an email with our decision.",
    },
    {
      step: "03",
      title: "Go live and start receiving donations",
      description:
        "Once approved, your profile is published immediately. Donors can find you through search, category browsing, and curated spotlights.",
    },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="py-20" style={{ backgroundColor: "#e8f5ee" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-5xl font-bold text-gray-900 mb-6">
            Reach thousands of motivated donors
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed mb-10">
            List your 501(c)(3) organization on EasyToGive and get discovered by
            donors who are actively building charitable giving portfolios. No
            platform fees — we only charge a standard payment processing fee.
          </p>
          <Link
            href="/signup/organization"
            className="inline-block px-8 py-4 rounded-full text-white font-semibold text-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Apply Now
          </Link>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="bg-white py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt
                  className="font-display text-4xl font-bold mb-1"
                  style={{ color: "#1a7a4a" }}
                >
                  {stat.value}
                </dt>
                <dd className="text-gray-500 text-sm font-medium">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Why list on EasyToGive */}
      <section className="py-20" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
            Why list on EasyToGive?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div
                    className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
                    style={{ backgroundColor: "#e8f5ee" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How verification works */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
            How verification works
          </h2>
          <div className="relative">
            {/* Connecting line */}
            <div
              className="absolute left-7 top-10 bottom-10 w-0.5 hidden sm:block"
              style={{ backgroundColor: "#e8f5ee" }}
            />
            <div className="space-y-10">
              {timelineSteps.map((item) => (
                <div key={item.step} className="flex items-start gap-6">
                  <div
                    className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    {item.step}
                  </div>
                  <div className="pt-2">
                    <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <blockquote>
            <p className="font-display text-2xl font-medium text-gray-900 leading-relaxed mb-6">
              &ldquo;Getting listed on EasyToGive brought us 140 new donors in
              our first month. The consolidated payments alone save our treasurer
              hours of reconciliation work every week.&rdquo;
            </p>
            <footer className="text-gray-600">
              <span className="font-semibold text-gray-900">Pastor James R.</span>
              <span className="mx-2 text-gray-400">&mdash;</span>
              Memphis, TN
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
            Ready to grow your donor base?
          </h2>
          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
            Join over 12,400 verified nonprofits already connecting with
            motivated donors on EasyToGive.
          </p>
          <Link
            href="/signup/organization"
            className="inline-block px-10 py-4 rounded-full text-white font-semibold text-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Apply to List Your Organization
          </Link>
        </div>
      </section>
    </main>
  );
}
