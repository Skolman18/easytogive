import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TaxFAQPage() {
  return (
    <main style={{ backgroundColor: "#faf9f6" }} className="min-h-screen py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm p-10 sm:p-12">

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium mb-8"
            style={{ color: "#1a7a4a" }}
          >
            <ArrowLeft size={15} />
            Back
          </Link>

          <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">
            Tax FAQ
          </h1>
          <p className="text-sm text-gray-500 mb-6">Last Updated: March 2026</p>

          {/* Disclaimer notice */}
          <div
            className="rounded-lg px-5 py-4 mb-10 text-sm leading-relaxed"
            style={{ backgroundColor: "#fffbeb", borderLeft: "3px solid #d97706", color: "#92400e" }}
          >
            <strong>Important:</strong> EasyToGive is not a tax advisor. The information on this
            page is general in nature and provided for educational purposes only. Consult a
            licensed CPA or tax professional for advice specific to your situation.
          </div>

          <div className="space-y-8 text-base text-gray-700 leading-relaxed">

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Are my donations through EasyToGive tax-deductible?
              </h2>
              <p>
                Yes, for most donors. Every organization listed on EasyToGive is a verified
                501(c)(3) tax-exempt nonprofit. Donations to these organizations are generally
                tax-deductible to the full extent permitted by federal law. To claim a
                deduction, you must itemize deductions on Schedule A of your federal tax return
                rather than taking the standard deduction. Whether itemizing benefits you
                depends on your individual tax situation — a CPA can help you decide.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Are donations to churches and religious organizations deductible?
              </h2>
              <p>
                Generally yes. Churches, synagogues, mosques, and other religious organizations
                are typically tax-exempt under Section 501(c)(3) even if they have not applied
                for formal IRS recognition. Donations to qualifying religious organizations
                listed on EasyToGive are deductible on the same basis as other charitable
                contributions. As always, consult a tax professional if you have questions about
                a specific organization or contribution.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                What documentation will I receive?
              </h2>
              <p className="mb-3">
                EasyToGive provides two types of tax documentation:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-2">
                <li>
                  <strong>Per-donation receipt</strong> — Emailed to you automatically after
                  each donation is processed. It includes the organization name, EIN, donation
                  amount, date, and a statement that no goods or services were provided in
                  exchange.
                </li>
                <li>
                  <strong>Annual giving summary</strong> — A consolidated summary of all
                  donations made during the calendar year, available in your profile under Tax
                  Documents. This summary is made available by <strong>January 31</strong> of
                  the following year and can be used when preparing your tax return.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Is the EasyToGive platform fee tax-deductible?
              </h2>
              <p>
                No. The 1% platform fee charged by EasyToGive is a service fee paid to a
                for-profit company and is <strong>not</strong> a charitable contribution. It is
                not tax-deductible. Only the net amount that reaches the recipient nonprofit is
                eligible for a charitable deduction.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                How do I file a charitable deduction on my tax return?
              </h2>
              <p>
                To deduct charitable contributions, you must itemize deductions using{" "}
                <strong>Schedule A (Form 1040)</strong>. You cannot claim charitable deductions
                if you take the standard deduction. For cash donations under $250, a bank
                record or written receipt is sufficient. For donations of $250 or more, you
                need a written acknowledgment from the charity — which EasyToGive provides
                automatically with every receipt. Keep your receipts and annual summary for
                your records.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Is EasyToGive a donor-advised fund (DAF)?
              </h2>
              <p>
                No. EasyToGive is <strong>not</strong> a donor-advised fund. A DAF allows you
                to make an irrevocable contribution to a sponsoring organization, receive an
                immediate tax deduction, and recommend grants to charities over time.
                EasyToGive does not offer DAF accounts. Donations made through EasyToGive go
                directly to the recipient nonprofit — there is no intermediate fund account in
                your name.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                What is the IRS VITA program?
              </h2>
              <p>
                The IRS Volunteer Income Tax Assistance (VITA) program offers free tax help to
                people who generally make $67,000 or less, people with disabilities, and
                limited English-speaking taxpayers. VITA sites are staffed by IRS-certified
                volunteers and can help you correctly claim your charitable deductions. Visit{" "}
                <a
                  href="https://www.irs.gov/vita"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                  style={{ color: "#1a7a4a" }}
                >
                  irs.gov/vita
                </a>{" "}
                to find a site near you.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                How do I download my giving history?
              </h2>
              <p className="mb-3">
                Your complete giving history is available in your account profile:
              </p>
              <ol className="list-decimal list-outside pl-5 space-y-1">
                <li>Sign in to your EasyToGive account.</li>
                <li>
                  Navigate to{" "}
                  <Link
                    href="/profile"
                    className="underline underline-offset-2"
                    style={{ color: "#1a7a4a" }}
                  >
                    Profile
                  </Link>{" "}
                  and select the <strong>Tax Documents</strong> tab.
                </li>
                <li>
                  Click <strong>Download Annual Summary</strong> to export a PDF of your full
                  giving history for the selected year.
                </li>
              </ol>
              <p className="mt-3">
                Individual transaction receipts are also emailed to you after each donation and
                remain accessible in your profile history.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Still have questions?
              </h2>
              <p>
                For platform-related questions, email us at{" "}
                <a
                  href="mailto:seth@easytogive.com"
                  className="underline underline-offset-2 font-medium"
                  style={{ color: "#1a7a4a" }}
                >
                  seth@easytogive.com
                </a>
                . For tax advice specific to your situation, please consult a licensed CPA or
                enrolled agent.
              </p>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
