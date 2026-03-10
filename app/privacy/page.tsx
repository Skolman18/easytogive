export default function PrivacyPage() {
  return (
    <main className="bg-white py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-3">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-12">
          Last updated: January 1, 2025
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          {/* Introduction */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Introduction
            </h2>
            <p className="mb-3">
              EasyToGive, Inc. (&ldquo;EasyToGive,&rdquo; &ldquo;we,&rdquo;
              &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to
              protecting your personal information and your right to privacy. This
              Privacy Policy explains what information we collect, how we use it,
              and what rights you have in relation to it.
            </p>
            <p>
              By using our website at easytogive.com and our services
              (collectively, the &ldquo;Service&rdquo;), you agree to the
              collection and use of information in accordance with this policy. If
              you do not agree with the terms of this policy, please discontinue
              use of the Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Information We Collect
            </h2>
            <p className="mb-4">
              We collect several types of information in connection with your use
              of EasyToGive:
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Account Information
            </h3>
            <p className="mb-4">
              When you create an account, we collect your name, email address,
              and password. If you are registering a nonprofit organization, we
              also collect your organization&apos;s name, Employer Identification
              Number (EIN), and contact information.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Donation Information
            </h3>
            <p className="mb-4">
              When you make a donation, we collect records of the transaction
              including the amount donated, the recipient organization(s), the
              date, and the allocation percentages in your giving portfolio.
              Payment card details are handled directly by Stripe, our payment
              processor, and are not stored on our servers.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Device and Usage Information
            </h3>
            <p>
              We automatically collect certain information when you visit our
              Service, including your IP address, browser type, operating system,
              referring URLs, pages viewed, and the dates and times of your
              visits. We collect this information using cookies and similar
              tracking technologies.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              How We Use Your Information
            </h2>
            <p className="mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>
                <strong>To process your donations</strong> — We use your payment
                and account information to execute donations, distribute funds to
                recipient organizations, and maintain accurate transaction
                records.
              </li>
              <li>
                <strong>To send tax receipts and account communications</strong>{" "}
                — We email tax-deductible donation receipts after each
                transaction and provide consolidated annual summaries for tax
                filing purposes.
              </li>
              <li>
                <strong>To improve our Service</strong> — Usage data helps us
                understand how people interact with EasyToGive so we can improve
                features, fix issues, and build a better experience.
              </li>
              <li>
                <strong>To communicate with you</strong> — We may send you
                service-related announcements, product updates, and — with your
                consent — promotional communications. You may opt out of
                marketing emails at any time.
              </li>
              <li>
                <strong>To comply with legal obligations</strong> — We may use
                or disclose your information as required by law, court order, or
                government regulation.
              </li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Information Sharing
            </h2>
            <p className="mb-3">
              We do not sell, trade, or rent your personal information to third
              parties. We may share your information only in the following
              circumstances:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>
                <strong>Payment processors</strong> — We share necessary payment
                information with Stripe, Inc. to process your transactions.
                Stripe&apos;s use of your information is governed by their
                Privacy Policy.
              </li>
              <li>
                <strong>Email service providers</strong> — We use third-party
                email providers to deliver receipts and communications. These
                providers are contractually prohibited from using your
                information for their own purposes.
              </li>
              <li>
                <strong>Recipient nonprofits</strong> — When you donate to an
                organization, we share your name and donation amount with that
                organization unless you designate your donation as anonymous.
              </li>
              <li>
                <strong>Legal compliance</strong> — We may disclose your
                information if required to do so by law or in response to valid
                legal process.
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Data Retention
            </h2>
            <p className="mb-3">
              We retain your personal information for as long as your account is active or as
              needed to provide you with the Service. Specifically:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>
                <strong>Account data</strong> — Retained until you request deletion of your
                account. You may request deletion at any time by emailing{" "}
                <a
                  href="mailto:seth@easytogive.com"
                  className="underline underline-offset-2"
                  style={{ color: "#1a7a4a" }}
                >
                  seth@easytogive.com
                </a>
                .
              </li>
              <li>
                <strong>Donation records</strong> — Retained for seven (7) years following
                the date of each transaction to comply with IRS recordkeeping requirements and
                to provide accurate tax documentation.
              </li>
              <li>
                <strong>Usage and device data</strong> — Retained for up to 24 months, after
                which it is aggregated or deleted.
              </li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Children&apos;s Privacy
            </h2>
            <p>
              EasyToGive is not directed to children under the age of 13, and we do not
              knowingly collect personal information from children under 13. If you believe
              we have inadvertently collected information from a child under 13, please
              contact us at{" "}
              <a
                href="mailto:seth@easytogive.com"
                className="underline underline-offset-2"
                style={{ color: "#1a7a4a" }}
              >
                seth@easytogive.com
              </a>{" "}
              and we will promptly delete the information.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Cookies
            </h2>
            <p className="mb-3">
              We use cookies and similar tracking technologies to operate and
              improve our Service. Cookies are small data files placed on your
              device that help us recognize you, maintain your session, and
              understand how you use our platform.
            </p>
            <p>
              You can instruct your browser to refuse all cookies or to indicate
              when a cookie is being sent. However, if you do not accept cookies,
              some portions of our Service may not function properly. You may
              also opt out of certain analytics tracking by adjusting your browser
              settings or using available opt-out mechanisms provided by our
              analytics vendors.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Data Security
            </h2>
            <p className="mb-3">
              We implement industry-standard security measures to protect your
              personal information against unauthorized access, disclosure,
              alteration, or destruction. All data transmitted between your
              browser and our servers is encrypted using TLS (Transport Layer
              Security).
            </p>
            <p>
              While we take reasonable steps to protect your information, no
              method of transmission over the Internet or method of electronic
              storage is 100% secure. We cannot guarantee absolute security and
              encourage you to use a strong, unique password for your EasyToGive
              account.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Your Rights
            </h2>
            <p className="mb-3">
              Depending on your location, you may have certain rights regarding
              your personal information:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>
                <strong>Access</strong> — You have the right to request a copy
                of the personal information we hold about you.
              </li>
              <li>
                <strong>Correction</strong> — You may update or correct
                inaccurate information through your account settings or by
                contacting us directly.
              </li>
              <li>
                <strong>Deletion</strong> — You may request that we delete your
                personal information. Please note that some information may be
                retained as required by law or for legitimate business purposes
                such as tax record-keeping.
              </li>
              <li>
                <strong>Opt-out</strong> — You may opt out of marketing
                communications at any time by clicking the unsubscribe link in
                any email or by contacting us.
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us using the
              information below.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy
              Policy or our data practices, please contact us at:
            </p>
            <p className="mt-3">
              <a
                href="mailto:seth@easytogive.com"
                className="font-medium underline underline-offset-2"
                style={{ color: "#1a7a4a" }}
              >
                seth@easytogive.com
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
