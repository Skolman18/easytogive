import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 mb-10">Last Updated: March 2026</p>

          <div className="space-y-10 text-base text-gray-700 leading-relaxed">

            {/* 1. Acceptance */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="mb-3">
                These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding
                agreement between you and EasyToGive, Inc. (&ldquo;EasyToGive,&rdquo;
                &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) governing your
                access to and use of easytogive.com and our services (collectively, the
                &ldquo;Service&rdquo;).
              </p>
              <p>
                By accessing or using the Service, you agree to be bound by these Terms. If
                you do not agree, you may not use the Service. We reserve the right to modify
                these Terms at any time; continued use after any changes constitutes your
                acceptance of the revised Terms.
              </p>
            </section>

            {/* 2. What We Are */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                2. What We Are
              </h2>
              <p className="mb-3">
                EasyToGive is a <strong>for-profit marketplace</strong> that connects donors
                with vetted nonprofit organizations. We are <strong>not</strong> a charitable
                organization, a nonprofit, a foundation, or a donor-advised fund (DAF). We do
                not provide any legal, tax, financial, or investment advice.
              </p>
              <p>
                Donations are made directly to recipient 501(c)(3) nonprofits. EasyToGive
                facilitates payment processing and disbursement but does not retain donated
                funds beyond what is necessary to process and forward your contribution.
              </p>
            </section>

            {/* 3. Eligibility */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                3. Eligibility
              </h2>
              <p>
                You must be at least <strong>18 years of age</strong> to use the Service. By
                using EasyToGive, you represent and warrant that you are 18 or older and have
                the legal capacity to enter into these Terms. If you are under 18, you may not
                use the Service.
              </p>
            </section>

            {/* 4. Your Account */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                4. Your Account
              </h2>
              <p className="mb-3">
                You are responsible for maintaining the confidentiality of your account
                credentials and for all activities that occur under your account. You agree
                to notify us immediately of any unauthorized use of your account.
              </p>
              <p>
                You agree to provide accurate, current, and complete information when creating
                an account and to keep your information updated. EasyToGive reserves the right
                to suspend or terminate accounts that contain false or misleading information.
              </p>
            </section>

            {/* 5. Donations */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                5. Donations
              </h2>
              <p className="mb-3">
                By initiating a donation through the Service, you agree to the following:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-3">
                <li>
                  <strong>All donations are final and non-refundable.</strong> Once a
                  transaction is submitted, it cannot be reversed or refunded except at the
                  sole discretion of EasyToGive in cases of documented technical error.
                </li>
                <li>
                  <strong>Non-refundable disclosure at checkout.</strong> The non-refundable
                  nature of donations is disclosed on the checkout screen before you confirm
                  payment. By completing checkout you acknowledge and accept this policy.
                </li>
                <li>
                  <strong>Tax deductibility.</strong> Donations to verified 501(c)(3)
                  organizations through EasyToGive are generally tax-deductible to the full
                  extent permitted by law. You are responsible for consulting a qualified tax
                  advisor regarding the deductibility of your specific contributions.
                </li>
              </ul>
            </section>

            {/* 6. Organizations */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                6. Organizations
              </h2>
              <p className="mb-3">
                EasyToGive verifies the 501(c)(3) status of all listed organizations;
                however, we do not endorse, guarantee, or assume responsibility for the
                activities, operations, or use of funds of any listed organization. Listing
                on EasyToGive is not an endorsement of the organization&apos;s effectiveness
                or impact.
              </p>
              <p>
                We reserve the right, in our sole discretion, to remove or suspend any
                nonprofit listing at any time, including for loss of tax-exempt status,
                credible reports of misuse of funds, or violations of these Terms.
              </p>
            </section>

            {/* 7. User Conduct */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                7. User Conduct
              </h2>
              <p className="mb-3">You agree not to use the Service to:</p>
              <ul className="list-disc list-outside pl-5 space-y-2">
                <li>Violate any applicable local, state, national, or international law;</li>
                <li>
                  Submit false, misleading, or fraudulent information in connection with any
                  donation or nonprofit application;
                </li>
                <li>
                  Attempt to circumvent any security feature or access control of the Service;
                </li>
                <li>
                  Use automated scripts, bots, or scrapers to access the Service without our
                  prior written consent;
                </li>
                <li>
                  Interfere with or disrupt the integrity or performance of the Service or its
                  connected infrastructure.
                </li>
              </ul>
            </section>

            {/* 8. User Content */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                8. User Content
              </h2>
              <p className="mb-3">
                If you submit any content to EasyToGive — including nonprofit profile
                information, reviews, or comments — you grant us a non-exclusive, worldwide,
                royalty-free license to use, display, and distribute that content in
                connection with the Service.
              </p>
              <p>
                You represent that you have all necessary rights to the content you submit and
                that it does not violate any third-party intellectual property rights, privacy
                rights, or applicable law. EasyToGive reserves the right to remove any content
                that violates these Terms or our community standards.
              </p>
            </section>

            {/* 9. Platform Fee */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                9. Platform Fee
              </h2>
              <p className="mb-3">
                EasyToGive charges a <strong>1% platform fee</strong> on each donation to
                support the cost of operating and maintaining the Service. This fee is in
                addition to Stripe&apos;s standard payment processing fees and is disclosed
                clearly at checkout before you confirm your donation.
              </p>
              <p>
                The platform fee is not a charitable contribution and is not tax-deductible.
                Only the net amount received by the recipient nonprofit is eligible for a
                charitable deduction.
              </p>
            </section>

            {/* 10. Intellectual Property */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                10. Intellectual Property
              </h2>
              <p>
                The Service and its original content, features, and functionality are and will
                remain the exclusive property of EasyToGive, Inc. and its licensors. Our
                trademarks and trade dress may not be used in connection with any product or
                service without our prior written consent. Nothing in these Terms grants you
                any right, title, or interest in the Service beyond the limited license to use
                it as described herein.
              </p>
            </section>

            {/* 11. Disclaimers */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                11. Disclaimers
              </h2>
              <p className="mb-3">
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;
                WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
                LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p>
                EasyToGive does not warrant that the Service will be uninterrupted, error-free,
                or free of viruses or other harmful components. We do not guarantee the
                accuracy or completeness of any information on the platform, including
                nonprofit profiles and tax status information.
              </p>
            </section>

            {/* 12. Limitation of Liability */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                12. Limitation of Liability
              </h2>
              <p className="mb-3">
                To the maximum extent permitted by applicable law, EasyToGive, its officers,
                directors, employees, and agents shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages — including loss of
                profits, data, or goodwill — arising out of or in connection with your use of
                the Service.
              </p>
              <p>
                In no event shall EasyToGive&apos;s total liability to you for all claims
                exceed the greater of (a) the total platform fees you paid to EasyToGive in
                the twelve months preceding the claim, or (b) one hundred dollars ($100).
              </p>
            </section>

            {/* 13. Governing Law */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                13. Governing Law
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of
                the State of <strong>North Dakota</strong>, without regard to its conflict of
                law provisions. Any dispute arising from or relating to these Terms or the
                Service shall be subject to the exclusive jurisdiction of the state and federal
                courts located in North Dakota, and you consent to personal jurisdiction in
                such courts.
              </p>
            </section>

            {/* 14. Changes */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                14. Changes to These Terms
              </h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of
                material changes by posting the updated Terms on this page with a revised
                &ldquo;Last Updated&rdquo; date and, where required by law, by sending notice
                to the email address associated with your account. Your continued use of the
                Service after changes become effective constitutes your acceptance of the
                revised Terms.
              </p>
            </section>

            {/* 15. Contact */}
            <section>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-3">
                15. Contact
              </h2>
              <p>
                If you have questions about these Terms, please contact us at:
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
                EasyToGive, Inc. &bull; North Dakota, United States
              </p>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
