import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CompliancePage() {
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
            Compliance &amp; Trust
          </h1>
          <p className="text-sm text-gray-500 mb-10">Last Updated: March 2026</p>

          <div className="space-y-10 text-base text-gray-700 leading-relaxed">

            {/* Our Verification Process */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Our Verification Process
              </h2>
              <p className="mb-3">
                Every organization listed on EasyToGive is reviewed before appearing on our
                platform. Our verification process includes:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-2">
                <li>
                  <strong>IRS 501(c)(3) status confirmation</strong> — We verify each
                  organization&apos;s tax-exempt status directly through the IRS Tax Exempt
                  Organization Search database. Organizations must hold active 501(c)(3)
                  status to be listed.
                </li>
                <li>
                  <strong>EIN validation</strong> — We confirm that the Employer
                  Identification Number (EIN) provided by the organization matches the name
                  and status on record with the IRS.
                </li>
                <li>
                  <strong>Watchlist screening</strong> — We screen organizations against
                  relevant government and regulatory watchlists, including OFAC sanctions
                  lists, to ensure we do not facilitate donations to prohibited entities.
                </li>
                <li>
                  <strong>Ongoing monitoring</strong> — We periodically re-verify listed
                  organizations and remove any organization that loses its tax-exempt status
                  or is flagged for compliance issues.
                </li>
              </ul>
              <p className="mt-4">
                Verification confirms legal status — it is not an endorsement of an
                organization&apos;s programs, effectiveness, or use of funds. Donors are
                encouraged to conduct their own due diligence before giving.
              </p>
            </section>

            {/* Data Protection */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Data Protection
              </h2>
              <p className="mb-3">
                We take the security of your personal and financial information seriously.
                Our data protection practices include:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-2">
                <li>
                  <strong>Encryption in transit</strong> — All data exchanged between your
                  browser and our servers is encrypted using TLS 1.2 or higher.
                </li>
                <li>
                  <strong>Encryption at rest</strong> — Sensitive data stored in our
                  database is encrypted at rest using industry-standard algorithms.
                </li>
                <li>
                  <strong>Minimal data collection</strong> — We collect only the information
                  necessary to operate the Service. We do not sell your personal data and do
                  not use advertising cookies or tracking pixels.
                </li>
                <li>
                  <strong>Access controls</strong> — Access to production systems and user
                  data is restricted to authorized personnel on a need-to-know basis.
                </li>
                <li>
                  <strong>Supabase infrastructure</strong> — Our database is hosted on
                  Supabase, which operates on AWS infrastructure with row-level security
                  (RLS) policies enforced at the database layer. This ensures users can only
                  access their own data.
                </li>
              </ul>
              <p className="mt-4">
                For full details on how we collect, use, and protect your personal
                information, see our{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-2 font-medium"
                  style={{ color: "#1a7a4a" }}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            {/* Payment Security */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Payment Security
              </h2>
              <p className="mb-3">
                All payments on EasyToGive are processed by{" "}
                <strong>Stripe, Inc.</strong>, a global leader in payment infrastructure.
                Stripe is a certified <strong>PCI DSS Level 1</strong> service provider —
                the highest level of payment card industry certification. This means:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-2">
                <li>
                  Your credit and debit card details are entered directly into
                  Stripe&apos;s secure, hosted payment fields and are never transmitted to
                  or stored on EasyToGive&apos;s servers.
                </li>
                <li>
                  Stripe uses advanced fraud detection and machine learning to identify and
                  block suspicious transactions in real time.
                </li>
                <li>
                  All payment data is encrypted end-to-end and stored by Stripe in
                  compliance with PCI DSS requirements.
                </li>
              </ul>
              <p className="mt-4">
                EasyToGive never sees your full card number, CVV, or billing details. We only
                receive a tokenized reference from Stripe confirming that a payment was
                successfully authorized.
              </p>
            </section>

            {/* Charitable Solicitation */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Charitable Solicitation
              </h2>
              <p className="mb-3">
                Many U.S. states require organizations that solicit charitable contributions
                to register with state authorities before doing so. EasyToGive is a
                for-profit marketplace — we facilitate donations between donors and
                independent nonprofit organizations but do not ourselves solicit charitable
                contributions on behalf of any charity.
              </p>
              <p className="mb-3">
                Nonprofit organizations listed on EasyToGive are responsible for their own
                compliance with state charitable solicitation registration requirements in
                the states where they operate and solicit funds.
              </p>
              <p>
                Donors are responsible for verifying that recipient organizations are
                registered to solicit in their state, where required. EasyToGive provides
                IRS registration information to assist with this verification but cannot
                guarantee compliance by individual organizations.
              </p>
            </section>

            {/* Report a Concern */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                Report a Concern
              </h2>
              <p className="mb-3">
                We take reports of fraud, misuse of funds, misrepresentation, or other
                compliance concerns very seriously. If you believe a listed organization is
                fraudulent, has lost its tax-exempt status, or is misusing donor funds,
                please contact us immediately.
              </p>
              <p className="mb-3">
                We also welcome reports of technical security vulnerabilities, data privacy
                concerns, or any suspected unauthorized access to EasyToGive systems.
              </p>
              <p>
                To report a concern, email us at{" "}
                <a
                  href="mailto:seth@easytogive.com"
                  className="underline underline-offset-2 font-medium"
                  style={{ color: "#1a7a4a" }}
                >
                  seth@easytogive.com
                </a>{" "}
                with the subject line <strong>&ldquo;Compliance Concern&rdquo;</strong> or{" "}
                <strong>&ldquo;Security Report.&rdquo;</strong> We review all reports and
                aim to respond within two business days. Credible concerns about listed
                organizations are investigated and may result in immediate removal from the
                platform pending review.
              </p>

              <div
                className="mt-6 rounded-lg px-5 py-4 text-sm leading-relaxed"
                style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
              >
                <strong>Contact:</strong>{" "}
                <a
                  href="mailto:seth@easytogive.com"
                  className="underline underline-offset-2"
                  style={{ color: "#1a7a4a" }}
                >
                  seth@easytogive.com
                </a>{" "}
                &mdash; EasyToGive, Inc. &bull; North Dakota, United States
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
