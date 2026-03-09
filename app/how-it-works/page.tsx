import Link from "next/link";
import { FileText, BadgeCheck, PieChart, Lock } from "lucide-react";

export default function HowItWorksPage() {
  const donorSteps = [
    {
      number: 1,
      title: "Create your free account",
      description:
        "Sign up in under two minutes. No credit card required to get started — explore the platform before you give.",
    },
    {
      number: 2,
      title: "Discover verified organizations",
      description:
        "Browse thousands of 501(c)(3) nonprofits by category, location, or cause area. Every organization has been independently verified.",
    },
    {
      number: 3,
      title: "Build your giving portfolio",
      description:
        "Assign percentages to the causes you care about. Give 50% to food security, 30% to education, 20% to animal welfare — you decide.",
    },
    {
      number: 4,
      title: "Donate once, get one receipt",
      description:
        "Make a single donation and EasyToGive distributes the funds automatically. Receive one consolidated tax receipt covering everything.",
    },
  ];

  const nonprofitSteps = [
    {
      number: 1,
      title: "Submit your application",
      description:
        "Complete our simple online form with your organization's basic information and 501(c)(3) documentation.",
    },
    {
      number: 2,
      title: "We verify your 501(c)(3) status",
      description:
        "Our team reviews your application within 2 business days, cross-referencing IRS records to confirm your tax-exempt status.",
    },
    {
      number: 3,
      title: "Get discovered and receive payments",
      description:
        "Your profile goes live immediately after approval. Receive consolidated monthly payments directly to your bank account.",
    },
  ];

  const features = [
    {
      icon: FileText,
      title: "One receipt",
      description:
        "No matter how many organizations you support, you receive a single tax receipt covering every donation.",
    },
    {
      icon: BadgeCheck,
      title: "Verified orgs",
      description:
        "Every nonprofit on EasyToGive has been verified against IRS records. You'll never wonder if your donation is legitimate.",
    },
    {
      icon: PieChart,
      title: "Portfolio giving",
      description:
        "Allocate your giving across multiple causes with simple percentage sliders — just like a financial portfolio.",
    },
    {
      icon: Lock,
      title: "Secure payments",
      description:
        "All transactions are processed through Stripe with bank-level encryption. Your financial data is never stored on our servers.",
    },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-5xl font-bold text-gray-900 mb-6">
            How EasyToGive works
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Meaningful giving shouldn&apos;t require a spreadsheet.
          </p>
        </div>
      </section>

      {/* For Donors */}
      <section className="py-20" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
            For Donors
          </h2>
          <div className="space-y-8">
            {donorSteps.map((step) => (
              <div key={step.number} className="flex items-start gap-6">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  {step.number}
                </div>
                <div className="pt-1">
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Nonprofits */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
            For Nonprofits
          </h2>
          <div className="space-y-8">
            {nonprofitSteps.map((step) => (
              <div key={step.number} className="flex items-start gap-6">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2"
                  style={{ borderColor: "#1a7a4a", color: "#1a7a4a" }}
                >
                  {step.number}
                </div>
                <div className="pt-1">
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why EasyToGive */}
      <section className="py-20" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
            Why EasyToGive
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div
                    className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
                    style={{ backgroundColor: "#e8f5ee" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Join thousands of donors and nonprofits already using EasyToGive.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="inline-block px-8 py-4 rounded-full text-white font-semibold text-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Start Giving Free
            </Link>
            <Link
              href="/signup/organization"
              className="inline-block px-8 py-4 rounded-full font-semibold text-lg border-2 transition-colors hover:bg-gray-50"
              style={{ borderColor: "#1a7a4a", color: "#1a7a4a" }}
            >
              List Your Org
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
