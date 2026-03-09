export default function TermsPage() {
  return (
    <main className="bg-white py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-3">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-12">
          Last updated: January 1, 2025
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          {/* Acceptance of Terms */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="mb-3">
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally
              binding agreement between you and EasyToGive, Inc.
              (&ldquo;EasyToGive,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo;
              or &ldquo;us&rdquo;) governing your access to and use of the
              EasyToGive website and services (collectively, the
              &ldquo;Service&rdquo;).
            </p>
            <p>
              By accessing or using the Service, you agree to be bound by these
              Terms. If you do not agree to these Terms, you may not access or
              use the Service. We reserve the right to modify these Terms at any
              time. Continued use of the Service after any changes constitutes
              your acceptance of the revised Terms.
            </p>
          </section>

          {/* Use of Service */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              2. Use of Service
            </h2>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Eligibility
            </h3>
            <p className="mb-4">
              You must be at least 18 years of age to use the Service. By using
              EasyToGive, you represent and warrant that you are 18 years of age
              or older and have the legal capacity to enter into these Terms. If
              you are under 18, you may not use the Service.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Account Responsibility
            </h3>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You agree to notify us immediately of any unauthorized
              use of your account. EasyToGive is not liable for any loss or
              damage arising from your failure to maintain the security of your
              account.
            </p>
          </section>

          {/* Donations */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              3. Donations
            </h2>
            <p className="mb-3">
              EasyToGive facilitates charitable donations to verified 501(c)(3)
              nonprofit organizations. By initiating a donation through the
              Service, you agree to the following:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-3">
              <li>
                <strong>All donations are final.</strong> Donations processed
                through EasyToGive are irrevocable. Once a transaction is
                submitted, it cannot be reversed or refunded except at the sole
                discretion of EasyToGive in cases of documented technical error.
              </li>
              <li>
                <strong>Fiscal sponsorship.</strong> EasyToGive acts as an
                intermediary facilitating the transfer of funds between donors
                and recipient nonprofit organizations. We are not a charitable
                organization ourselves and do not retain donated funds.
              </li>
              <li>
                <strong>Processing fee.</strong> A standard payment processing
                fee of 2.9% + $0.30 per transaction applies to each donation.
                This fee covers credit and debit card processing costs charged
                by our payment processor, Stripe. Donors may elect to cover
                this fee on behalf of the recipient organization.
              </li>
              <li>
                <strong>Tax deductibility.</strong> Donations to verified
                501(c)(3) organizations through EasyToGive are tax-deductible to
                the extent permitted by law. EasyToGive will provide a
                consolidated donation receipt upon request. You are responsible
                for consulting a qualified tax advisor regarding the
                deductibility of your specific contributions.
              </li>
            </ul>
          </section>

          {/* Nonprofit Listings */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              4. Nonprofit Listings
            </h2>
            <p className="mb-3">
              EasyToGive verifies the 501(c)(3) status of all listed
              organizations; however, we do not endorse, guarantee, or take
              responsibility for the activities, operations, or use of funds of
              any listed organization.
            </p>
            <p>
              EasyToGive reserves the right, in its sole discretion, to remove,
              suspend, or decline any nonprofit listing at any time for any
              reason, including but not limited to: loss of tax-exempt status,
              credible reports of misuse of funds, violations of these Terms, or
              activity inconsistent with our community standards.
            </p>
          </section>

          {/* Prohibited Uses */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              5. Prohibited Uses
            </h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>
                Violate any applicable local, state, national, or international
                law or regulation;
              </li>
              <li>
                Submit false, misleading, or fraudulent information in
                connection with any donation or nonprofit application;
              </li>
              <li>
                Attempt to circumvent any security feature or access controls
                of the Service;
              </li>
              <li>
                Use automated scripts, bots, or other tools to scrape, crawl,
                or otherwise access the Service without our prior written consent;
              </li>
              <li>
                Engage in any activity that interferes with or disrupts the
                integrity or performance of the Service or the servers and
                networks connected to it.
              </li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              6. Intellectual Property
            </h2>
            <p>
              The Service and its original content, features, and functionality
              are and will remain the exclusive property of EasyToGive, Inc. and
              its licensors. Our trademarks and trade dress may not be used in
              connection with any product or service without the prior written
              consent of EasyToGive. Nothing in these Terms grants you any right,
              title, or interest in the Service or its content beyond the limited
              license to use the Service as expressly provided herein.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              7. Limitation of Liability
            </h2>
            <p className="mb-3">
              To the maximum extent permitted by applicable law, EasyToGive, its
              officers, directors, employees, and agents shall not be liable for
              any indirect, incidental, special, consequential, or punitive
              damages, including but not limited to loss of profits, data, or
              goodwill, arising out of or in connection with your use of the
              Service.
            </p>
            <p>
              In no event shall EasyToGive&apos;s total liability to you for all
              claims arising from or related to the Service exceed the greater of
              (a) the total amount of fees you paid to EasyToGive in the twelve
              months preceding the claim, or (b) one hundred dollars ($100).
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              8. Termination
            </h2>
            <p>
              We may terminate or suspend your account and access to the Service
              at our sole discretion, without prior notice, for conduct that we
              believe violates these Terms or is harmful to other users, us, or
              third parties, or for any other reason. Upon termination, your
              right to use the Service will immediately cease. Provisions of
              these Terms that by their nature should survive termination shall
              survive, including but not limited to ownership provisions,
              warranty disclaimers, and limitations of liability.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              9. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. We will
              notify you of material changes by posting the updated Terms on this
              page with a revised &ldquo;Last updated&rdquo; date and, where
              required by law, by sending notice to the email address associated
              with your account. Your continued use of the Service after the
              effective date of any changes constitutes your acceptance of the
              revised Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              10. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the State of Delaware, without regard to its conflict
              of law provisions. Any dispute arising from or relating to these
              Terms or the Service shall be subject to the exclusive jurisdiction
              of the state and federal courts located in the State of Delaware,
              and you consent to personal jurisdiction in such courts.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              11. Contact
            </h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mt-3">
              <a
                href="mailto:legal@easytogive.com"
                className="font-medium underline underline-offset-2"
                style={{ color: "#1a7a4a" }}
              >
                legal@easytogive.com
              </a>
            </p>
            <p className="mt-3 text-sm text-gray-500">
              EasyToGive, Inc. &bull; Wilmington, Delaware, United States
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
