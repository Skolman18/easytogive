import Link from "next/link";
import { Shield, Heart, CheckCircle } from "lucide-react";

export default function AboutPage() {
  const values = [
    {
      icon: Shield,
      title: "Transparency",
      description:
        "We believe donors deserve to know exactly where their money goes. Every organization on EasyToGive is verified, and every transaction is logged and accessible in your account history.",
    },
    {
      icon: Heart,
      title: "Accessibility",
      description:
        "Generosity shouldn't require a finance degree. We've designed EasyToGive so that anyone — regardless of income level or technical ability — can give meaningfully and confidently.",
    },
    {
      icon: CheckCircle,
      title: "Accountability",
      description:
        "We hold ourselves to the same standard we hold the organizations on our platform. That means clear fees, honest communication, and a commitment to improving the nonprofit ecosystem.",
    },
  ];

  const team = [
    {
      name: "Sarah Chen",
      title: "Co-founder & CEO",
      initials: "SC",
      color: "bg-emerald-100 text-emerald-800",
      bio: "Sarah spent a decade in nonprofit fundraising before co-founding EasyToGive to solve the inefficiencies she witnessed firsthand.",
    },
    {
      name: "Marcus Williams",
      title: "Co-founder & CTO",
      initials: "MW",
      color: "bg-blue-100 text-blue-800",
      bio: "Marcus is a software engineer who previously built fintech products at two venture-backed startups and wanted to apply that experience to social good.",
    },
    {
      name: "Priya Patel",
      title: "Head of Nonprofit Relations",
      initials: "PP",
      color: "bg-violet-100 text-violet-800",
      bio: "Priya has worked with over 200 nonprofit organizations across the country and leads EasyToGive's verification and partnership programs.",
    },
    {
      name: "James Rodriguez",
      title: "Head of Operations",
      initials: "JR",
      color: "bg-amber-100 text-amber-800",
      bio: "James brings a background in operations and logistics to ensure that every dollar donated through EasyToGive arrives accurately and on time.",
    },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-5xl font-bold text-gray-900 mb-6">
            Making generosity effortless
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            EasyToGive is a charitable giving platform that simplifies the way
            people donate — so you can focus on the causes you care about, not
            the paperwork. We believe that removing friction from giving leads
            to more giving, and more good in the world.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-6">
            Our Story
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            EasyToGive was founded in 2023 by a group of people frustrated by
            the friction of charitable giving — writing separate checks, tracking
            receipts, doing manual math to split donations across multiple causes.
            We each had organizations we cared deeply about, but the process of
            actually giving to them felt unnecessarily complicated.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            We built the platform we wished existed: one place to discover
            verified nonprofits, allocate your giving however you like, donate
            once, and receive a single tax receipt for everything. What started
            as a side project among friends has grown into a platform serving
            tens of thousands of donors and thousands of nonprofit organizations
            across the United States.
          </p>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="text-center">
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                    style={{ backgroundColor: "#e8f5ee" }}
                  >
                    <Icon className="w-7 h-7" style={{ color: "#1a7a4a" }} />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The Team */}
      <section className="py-20" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-12 text-center">
            The Team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white rounded-2xl p-6 flex items-start gap-5 shadow-sm"
              >
                <div
                  className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${member.color}`}
                >
                  {member.initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {member.name}
                  </p>
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: "#1a7a4a" }}
                  >
                    {member.title}
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {member.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
            Start giving smarter today
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Join tens of thousands of donors who have simplified their charitable
            giving with EasyToGive.
          </p>
          <Link
            href="/get-started"
            className="inline-block px-8 py-4 rounded-full text-white font-semibold text-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </main>
  );
}
