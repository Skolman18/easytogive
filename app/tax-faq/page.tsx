import Link from "next/link";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Are my donations through EasyToGive tax-deductible?",
    answer:
      "Yes. Every organization listed on EasyToGive has been independently verified as a 501(c)(3) tax-exempt nonprofit with the IRS. That means your donations are tax-deductible to the full extent permitted by law. You will receive a donation receipt after each transaction that you can use for your tax records.",
  },
  {
    question: "What is a 501(c)(3) organization?",
    answer:
      "A 501(c)(3) organization is a nonprofit entity that has received tax-exempt status from the Internal Revenue Service (IRS) under Section 501(c)(3) of the Internal Revenue Code. This designation means the organization operates for charitable, religious, educational, scientific, or literary purposes — and that donations made to it are generally deductible from the donor's federal taxable income.",
  },
  {
    question: "How do I get my tax receipt?",
    answer:
      "EasyToGive automatically emails a tax receipt to the address on your account after each donation is processed. In addition, a consolidated annual giving summary — listing every donation you made during the calendar year — is available in your profile under Tax Documents. This summary is typically available by January 15 of the following year.",
  },
  {
    question: "What is the deadline for charitable deductions?",
    answer:
      "To claim a charitable deduction for a given tax year, your donation must be made by December 31 of that year. Donations made on or after January 1 count toward the following tax year. The postmark or electronic transaction date determines when a donation is considered made — not when the funds arrive at the nonprofit.",
  },
  {
    question: "How much of my donation can I deduct?",
    answer:
      "For cash donations to public charities (which includes all organizations on EasyToGive), you can generally deduct up to 60% of your adjusted gross income (AGI) in a given tax year. If your charitable contributions exceed this limit, you may be able to carry forward the excess to future tax years for up to five years. We recommend consulting a qualified tax professional for advice specific to your situation.",
  },
  {
    question: "What if I donate through a giving portfolio?",
    answer:
      "When you donate through a giving portfolio that allocates funds across multiple organizations, each organization is itemized individually on your tax receipt. You will see the name, EIN, and amount donated to every recipient — giving you a complete record for tax filing purposes, regardless of how many organizations your donation was split across.",
  },
  {
    question: "Can I donate appreciated stock through EasyToGive?",
    answer:
      "Not currently. EasyToGive accepts credit cards and debit cards only. We do not currently support donations of appreciated securities, cryptocurrency, donor-advised fund (DAF) grants, or other non-cash assets. We plan to expand our payment options in the future — sign up for our newsletter to be notified when new giving methods become available.",
  },
  {
    question: "I have a question that isn't answered here.",
    answer:
      "Our support team is happy to help. Reach us at support@easytogive.com and we'll respond within one business day. For questions specific to your tax situation, we recommend consulting a certified public accountant (CPA) or tax advisor.",
  },
];

export default function TaxFAQPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-5xl font-bold text-gray-900 mb-5">
            Tax Deduction FAQ
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about the tax benefits of charitable
            giving through EasyToGive.
          </p>
        </div>
      </section>

      {/* FAQ Items */}
      <section className="py-16" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-7 shadow-sm"
              >
                <h2 className="font-display text-lg font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h2>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                {faq.question.includes("not answered here") && (
                  <p className="mt-3 text-gray-600">
                    Email us at{" "}
                    <a
                      href="mailto:support@easytogive.com"
                      className="font-medium underline underline-offset-2"
                      style={{ color: "#1a7a4a" }}
                    >
                      support@easytogive.com
                    </a>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-gray-900 mb-3">
            Looking for your tax documents?
          </h2>
          <p className="text-gray-600 text-lg mb-7">
            Your donation receipts and annual giving summary are available in
            your profile.
          </p>
          <Link
            href="/profile"
            className="inline-block px-8 py-4 rounded-full text-white font-semibold text-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            View My Tax Documents
          </Link>
        </div>
      </section>
    </main>
  );
}
