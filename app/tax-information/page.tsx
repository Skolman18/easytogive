import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tax Information | EasyToGive",
  description:
    "Learn how to maximize your charitable deductions in 2026. Donation bunching, Donor Advised Funds, QCDs, non-cash donations, and recurring giving strategies — explained in plain English.",
};

export default function TaxInformationPage() {
  const keyNumbers = [
    { value: "$16,100", label: "Standard Deduction — Single filers" },
    { value: "$32,200", label: "Standard Deduction — Married filing jointly" },
    {
      value: "$1,000 / $2,000",
      label: "New above-the-line deduction for non-itemizers (single / MFJ)",
    },
    { value: "$111,000", label: "2026 QCD limit from IRA (age 70½+)" },
    { value: "60%", label: "Max AGI limit for cash donations to public charities" },
    { value: "0.5%", label: "New 2026 AGI floor for itemized deductions" },
  ];

  const dafFeatures = [
    {
      title: "Immediate Tax Deduction",
      description:
        "Full deduction in the year you fund the DAF — even if you do not grant the money out to organizations for months or years.",
    },
    {
      title: "Tax-Free Growth",
      description:
        "Money can be invested in stocks, bonds, or mutual funds. Any growth is tax-free and can be granted to charity.",
    },
    {
      title: "Perfect for Bunching",
      description:
        "Fund your DAF with two or three years of planned giving in one year. Take the full deduction now. Grant to organizations on your normal schedule.",
    },
    {
      title: "Donate Appreciated Assets",
      description:
        "Give stock, mutual funds, or other appreciated assets directly to a DAF. Avoid capital gains AND get a deduction for the full fair market value.",
    },
  ];

  const strategyRows = [
    {
      situation: "Take standard deduction, give under $1,000/year",
      strategy:
        "Claim the new 2026 above-the-line deduction — up to $1,000 single, $2,000 joint",
    },
    {
      situation: "Take standard deduction, give $3,000-$8,000/year",
      strategy: "Donation bunching + DAF to itemize every 2-3 years",
    },
    {
      situation: "Itemize and give regularly",
      strategy:
        "Be aware of the new 0.5% AGI floor — consider bunching to maximize above it",
    },
    {
      situation: "Own appreciated stock",
      strategy:
        "Donate stock directly — avoid capital gains, get full fair market value deduction",
    },
    {
      situation: "Age 70½+ with an IRA",
      strategy:
        "QCD every time — excludes from AGI, counts toward RMD, no floor applies",
    },
    {
      situation: "In the 37% tax bracket",
      strategy:
        "Consult a tax advisor — the new deduction cap requires careful planning",
    },
    {
      situation: "Want to give big now, spread over time",
      strategy:
        "Fund a DAF now, take the deduction, grant to orgs on your schedule",
    },
  ];

  return (
    <main style={{ backgroundColor: "#faf9f6" }}>
      {/* Hero */}
      <section
        className="py-12 sm:py-16"
        style={{ backgroundColor: "#1a7a4a", color: "#ffffff" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wide uppercase mb-3 opacity-90">
            Donor Resource Guide
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Tax Information
          </h1>
          <p className="text-sm sm:text-base md:text-lg max-w-2xl text-gray-100 mb-4">
            Everything you need to know about maximizing your charitable deductions in 2026 — explained in plain English.
          </p>
          <p className="text-xs sm:text-sm italic text-gray-100/90 max-w-2xl">
            This page is for educational purposes only. Always consult a qualified tax advisor for advice specific to your situation.
          </p>
        </div>
      </section>

      {/* 2026 Alert Banner */}
      <section
        className="border-b"
        style={{ backgroundColor: "#fffbeb", borderColor: "#e5e1d8" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="font-display text-base sm:text-lg font-semibold text-gray-900 mb-1">
            2026 Rule Changes — Read This First
          </h2>
          <p className="text-sm text-gray-800 leading-relaxed">
            The One Big Beautiful Bill Act (OBBBA) passed in 2025 changed the rules for charitable deductions starting in 2026.
            There are new opportunities for everyday donors AND new limits for high earners. The strategies on this page reflect
            the new 2026 rules.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* 2026 Key Numbers */}
          <section>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
              2026 Key Numbers
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              These are the headline figures that shape how charitable deductions work in 2026. Keep them in mind as you plan.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {keyNumbers.map((item) => (
                <div
                  key={item.label}
                  className="bg-white rounded-xl shadow-sm p-4 border"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  <div
                    className="h-1 w-full rounded-t-xl mb-3"
                    style={{ backgroundColor: "#1a7a4a" }}
                  />
                  <div
                    className="font-display text-xl font-bold mb-1"
                    style={{ color: "#1a7a4a" }}
                  >
                    {item.value}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-t" style={{ borderColor: "#e5e1d8" }} />

          {/* Section 1 — Charitable Deduction Basics */}
          <section>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Charitable Deduction Basics
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-4">
              Who can deduct what — and how much
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-6">
              A charitable deduction lets you reduce your taxable income by the amount you give to qualified organizations.
              In 2026, two major groups benefit in different ways.
            </p>

            <div className="space-y-8">
              {/* Standard deduction */}
              <div>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  If You Take the Standard Deduction
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  Previously, taking the standard deduction meant zero tax benefit from charitable giving.
                  In 2026 that changed. The OBBBA created a new above-the-line deduction — you can now deduct
                  up to $1,000 (single) or $2,000 (married filing jointly) in cash donations even without itemizing.
                </p>
                <div
                  className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed"
                  style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
                >
                  <p className="font-semibold text-gray-900 mb-1">
                    New for 2026 — Non-Itemizer Deduction
                  </p>
                  <p className="text-gray-700">
                    Single filer donates $800 to their church. They take the standard deduction. Under 2025 rules:
                    $0 tax benefit. Under 2026 rules: $800 deduction, saving roughly $96-$176 depending on their bracket.
                    Note: Cash donations only. Donated goods and stock do not count. Gifts to Donor Advised Funds do not
                    qualify for this deduction.
                  </p>
                </div>
              </div>

              {/* Itemizers */}
              <div>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  If You Itemize Deductions
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  Itemizers can deduct up to 60% of AGI for cash gifts.
                  But 2026 introduced a new 0.5% AGI floor — only the portion of your giving that exceeds 0.5% of your AGI is deductible.
                </p>
                <div
                  className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed mb-4"
                  style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
                >
                  <p className="text-gray-700">
                    Your AGI is $100,000. You donate $4,000. The 0.5% floor is $500. Your deductible amount = $3,500.
                    <br />
                    Your AGI is $200,000. You donate $5,000. Floor is $1,000. Deductible amount = $4,000.
                  </p>
                </div>
                <div
                  className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed"
                  style={{ backgroundColor: "#fef2f2", borderLeft: "3px solid #b91c1c" }}
                >
                  <p className="font-semibold text-gray-900 mb-1">
                    High Earners — New Cap in 2026
                  </p>
                  <p className="text-gray-700">
                    If you are in the 37% tax bracket, the value of your itemized deductions is capped at 35 cents per dollar.
                    A $1,000 donation that previously saved $370 now saves $350. Plan with a tax advisor.
                  </p>
                </div>
              </div>

              {/* What qualifies table */}
              <div>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-3">
                  What Qualifies
                </h3>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#e5e1d8" }}>
                  <table className="min-w-full text-left text-xs sm:text-sm">
                    <thead
                      className="text-xs font-semibold"
                      style={{ backgroundColor: "#f9fafb", color: "#111827" }}
                    >
                      <tr>
                        <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                          Organization Type
                        </th>
                        <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                          Deductible?
                        </th>
                        <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {[
                        [
                          "501(c)(3) nonprofits",
                          "Yes",
                          "Must have IRS determination letter",
                        ],
                        [
                          "Churches & religious orgs",
                          "Yes",
                          "Automatically tax-exempt, no 990 required",
                        ],
                        [
                          "Missionaries (through org)",
                          "Yes",
                          "Must give through a qualified org, not direct to individual",
                        ],
                        [
                          "GoFundMe / personal campaigns",
                          "No",
                          "Gifts to individuals are not deductible",
                        ],
                        [
                          "Political organizations",
                          "No",
                          "Never deductible",
                        ],
                        [
                          "Raffle tickets / auction items",
                          "Partial",
                          "Only the amount above fair market value",
                        ],
                      ].map(([org, deductible, notes]) => (
                        <tr key={org}>
                          <td className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                            {org}
                          </td>
                          <td className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                            {deductible}
                          </td>
                          <td className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                            {notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-t" style={{ borderColor: "#e5e1d8" }} />

          {/* Section 2 — Donation Bunching */}
          <section>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Donation Bunching
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-4">
              The strategy that turns a small tax benefit into a big one
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Donation bunching is one of the most powerful and underused tax strategies for everyday donors.
              Instead of spreading giving evenly across years, you concentrate two or three years of giving
              into one year so itemized deductions exceed the standard deduction — then take the standard
              deduction in off years.
            </p>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed mb-4"
              style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
            >
              <p className="text-gray-700">
                Married couple, AGI $120,000, standard deduction $32,200, gives $8,000/year.
                <br />
                Spreading: $8,000/year, never clears threshold. Tax benefit: roughly $0.
                <br />
                Bunching: Give $24,000 in year 1 via a DAF. Itemize year 1. Standard deduction years 2-3.
                <br />
                Total tax benefit over three years: potentially $2,000-$4,000.
              </p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              The 2026 changes make bunching even more relevant. With the new 0.5% AGI floor, smaller annual gifts
              may produce little or no deduction. Bunching multiple years into one year helps clear both the standard
              deduction threshold and the 0.5% floor in one shot.
            </p>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
              How to Bunch Without Disrupting Your Giving
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Use a Donor Advised Fund (DAF). You put two or three years of giving into the DAF in one tax year,
              take the full deduction immediately, then distribute to your organizations on your normal schedule.
              Orgs get consistent funding. You get the tax benefit up front.
            </p>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed"
              style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
            >
              <p className="font-semibold text-gray-900 mb-1">
                EasyToGive + Bunching
              </p>
              <p className="text-gray-700">
                Your EasyToGive giving portfolio is the perfect tool to execute a bunching strategy.
                Set up your portfolio allocations, fund it with a larger amount in your bunching year,
                and let it distribute to your organizations on your normal monthly schedule. Your giving stays consistent.
                Your taxes get optimized.
              </p>
            </div>
          </section>

          <hr className="border-t" style={{ borderColor: "#e5e1d8" }} />

          {/* Section 3 — Donor Advised Funds */}
          <section>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Donor Advised Funds (DAF)
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-4">
              The most powerful giving tool most people have never heard of
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-6">
              A Donor Advised Fund is like a charitable savings account. You contribute money to the DAF, get the full tax
              deduction immediately in the year of the contribution, and then distribute grants to any qualifying organization
              over time — on your own schedule. The money in a DAF can be invested and grow tax-free. DAFs are offered by
              Fidelity Charitable, Schwab Charitable, Vanguard Charitable, and community foundations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {dafFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl shadow-sm p-4 border"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  <h3 className="font-display text-sm font-semibold text-gray-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed mb-4"
              style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
            >
              <p className="font-semibold text-gray-900 mb-1">
                DAF in Action — The Power Move
              </p>
              <p className="text-gray-700">
                You own stock worth $50,000 that you bought for $10,000.
                <br />
                Option A — Sell stock, donate cash: Pay capital gains on $40,000 (~$8,000 tax), donate remaining cash.
                <br />
                Option B — Donate stock directly to DAF: Zero capital gains. Full $50,000 deduction in year one.
                Grant $10,000/year to your orgs for five years.
                <br />
                You kept $8,000 that otherwise went to the IRS — and it all went to your causes.
              </p>
            </div>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed"
              style={{ backgroundColor: "#fef2f2", borderLeft: "3px solid #b91c1c" }}
            >
              <p className="font-semibold text-gray-900 mb-1">
                2026 DAF Note
              </p>
              <p className="text-gray-700">
                The new non-itemizer above-the-line deduction ($1,000 / $2,000) does NOT apply to DAF contributions.
                DAF contributions still require itemizing to generate a deduction.
              </p>
            </div>
          </section>

          <hr className="border-t" style={{ borderColor: "#e5e1d8" }} />

          {/* Section 4 — QCDs */}
          <section>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Qualified Charitable Distributions (QCD)
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-4">
              The best giving strategy for retirees — and it just got better in 2026
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              If you are age 70½ or older with an IRA, a QCD is almost certainly the most tax-efficient giving strategy available.
              A QCD lets you transfer money directly from your IRA to a qualifying charity — up to $111,000 per person in 2026 —
              and exclude the entire amount from your taxable income.
            </p>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed mb-4"
              style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
            >
              <p className="text-gray-700">
                QCD vs. Regular Deduction — Age 75, $150,000 IRA, want to give $10,000.
                <br />
                Regular route: Take $10,000 from IRA (taxable income), donate, deduct minus the 0.5% floor.
                <br />
                QCD route: Transfer $10,000 directly from IRA to charity. Never appears in taxable income at all.
                No floor. No cap. Also lowers Medicare premiums and reduces Social Security taxation.
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border mb-4" style={{ borderColor: "#e5e1d8" }}>
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead
                  className="text-xs font-semibold"
                  style={{ backgroundColor: "#f9fafb", color: "#111827" }}
                >
                  <tr>
                    <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                      Rule
                    </th>
                    <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {[
                    ["Age requirement", "Must be 70½ or older at time of distribution"],
                    ["2026 annual limit", "$111,000 per person (inflation-adjusted annually)"],
                    ["Eligible accounts", "Traditional IRA, inherited IRA"],
                    ["RMD satisfaction", "QCDs count toward your Required Minimum Distribution"],
                    [
                      "Eligible organizations",
                      "Must go directly to 501(c)(3) — NOT to DAFs or private foundations",
                    ],
                    [
                      "Payment",
                      "Check must be made payable to the charity, not to you",
                    ],
                  ].map(([rule, details]) => (
                    <tr key={rule}>
                      <td className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                        {rule}
                      </td>
                      <td className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                        {details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed"
              style={{ backgroundColor: "#eff6ff", borderLeft: "3px solid #1d4ed8" }}
            >
              <p className="font-semibold text-gray-900 mb-1">
                Why QCDs Are Even Better After 2026
              </p>
              <p className="text-gray-700">
                The new 0.5% AGI floor on itemized deductions does NOT apply to QCDs. A QCD is an income exclusion,
                not a deduction — it reduces your AGI directly. This also lowers Medicare Part B and D premiums,
                reduces Social Security taxation, and avoids new itemization limits entirely. For donors over 70½,
                QCDs are almost always the right move.
              </p>
            </div>
          </section>

          <hr className="border-t" style={{ borderColor: "#e5e1d8" }} />

          {/* Section 5 — Non-Cash Donations */}
          <section>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Non-Cash Donations
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-4">
              Giving more than money — the tax rules for property, stock, and goods
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Cash is not the only thing you can give — and sometimes it is not the best thing. Donating appreciated assets
              like stock, real estate, or mutual funds can be significantly more tax-efficient.
            </p>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
              Appreciated Stock &amp; Securities
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              If you own stock, mutual funds, or ETFs that have increased in value, donating them directly instead of selling
              first is one of the most powerful strategies available. You receive a deduction for the full fair market value
              AND you pay zero capital gains tax.
            </p>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed mb-4"
              style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
            >
              <p className="text-gray-700">
                You bought 100 shares at $10/share ($1,000 basis). They are now worth $50/share ($5,000).
                <br />
                Sell and donate cash: Pay capital gains on $4,000 gain (~$600-$800 tax), donate ~$4,200-$4,400.
                <br />
                Donate stock directly: Zero capital gains. Deduction: full $5,000 fair market value.
                <br />
                You gave $800 more to the cause and saved more in taxes.
              </p>
            </div>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-3">
              Documentation Requirements
            </h3>
            <div className="overflow-x-auto rounded-lg border mb-4" style={{ borderColor: "#e5e1d8" }}>
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead
                  className="text-xs font-semibold"
                  style={{ backgroundColor: "#f9fafb", color: "#111827" }}
                >
                  <tr>
                    <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                      Gift Value
                    </th>
                    <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                      Documentation Required
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {[
                    ["Under $250 cash", "Bank record or receipt from charity"],
                    ["$250+ cash or non-cash", "Written acknowledgment from charity by tax filing date"],
                    ["Non-cash $500-$5,000", "IRS Form 8283, Section A"],
                    ["Non-cash over $5,000", "Qualified independent appraisal + IRS Form 8283, Section B"],
                  ].map(([value, docs]) => (
                    <tr key={value}>
                      <td className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                        {value}
                      </td>
                      <td className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                        {docs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed"
              style={{ backgroundColor: "#eff6ff", borderLeft: "3px solid #1d4ed8" }}
            >
              <p className="font-semibold text-gray-900 mb-1">
                EasyToGive Tax Receipts
              </p>
              <p className="text-gray-700">
                Every donation through EasyToGive generates an automatic tax receipt sent to your email immediately.
                Your Giving Wallet maintains a complete giving history you can download as a year-end summary — everything
                your tax advisor needs, no work required.
              </p>
            </div>
          </section>

          <hr className="border-t" style={{ borderColor: "#e5e1d8" }} />

          {/* Section 6 — Recurring Giving */}
          <section>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Tax Benefits of Recurring Giving
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-4">
              How monthly giving unlocks better tax outcomes over time
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Setting up a monthly recurring gift through EasyToGive is not just convenient — it can be a smarter tax
              strategy than giving one large gift at year-end.
            </p>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
              Track Everything Automatically
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              One of the most common donor mistakes at tax time is forgetting to track all their charitable giving.
              Recurring giving through EasyToGive eliminates this entirely. Every transaction is recorded in your Giving Wallet
              with date, amount, organization, and transaction ID — complete record ready at year-end.
            </p>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
              The $1,000 Non-Itemizer Deduction and Monthly Givers
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              For donors who take the standard deduction, the new 2026 above-the-line deduction rewards consistent giving.
              A donor who gives $85/month ($1,020/year) through EasyToGive captures nearly the full $1,000 single filer
              deduction automatically — without any special year-end planning.
            </p>
            <div
              className="rounded-lg px-4 py-3 text-xs sm:text-sm leading-relaxed"
              style={{ backgroundColor: "#e8f5ee", borderLeft: "3px solid #1a7a4a" }}
            >
              <p className="text-gray-700">
                You give $100/month to three organizations — $1,200/year total. You take the standard deduction.
                <br />
                Under 2026 rules you can deduct $1,000 of that giving above the line.
                <br />
                At a 22% tax bracket: saves you $220 in taxes. No extra planning required.
              </p>
            </div>
          </section>

          <hr className="border-t" style={{ borderColor: "#e5e1d8" }} />

          {/* Strategy Match Table */}
          <section>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Which Strategy Is Right for You?
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Use this quick reference to match your situation to the strategy that most often delivers the best tax outcome.
            </p>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#e5e1d8" }}>
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead
                  className="text-xs font-semibold"
                  style={{ backgroundColor: "#f9fafb", color: "#111827" }}
                >
                  <tr>
                    <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                      Your Situation
                    </th>
                    <th className="px-4 py-2 border-b" style={{ borderColor: "#e5e1d8" }}>
                      Best Strategy
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {strategyRows.map((row) => (
                    <tr key={row.situation}>
                      <td className="px-4 py-2 border-b align-top" style={{ borderColor: "#e5e1d8" }}>
                        {row.situation}
                      </td>
                      <td className="px-4 py-2 border-b align-top" style={{ borderColor: "#e5e1d8" }}>
                        {row.strategy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16" style={{ backgroundColor: "#1a7a4a" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="font-display text-3xl font-bold mb-3">
            Start Giving Smarter Today
          </h2>
          <p className="text-sm sm:text-base md:text-lg mb-6 max-w-2xl mx-auto text-gray-100">
            EasyToGive tracks every donation automatically, generates instant tax receipts, and gives you a complete giving history in your Giving Wallet — everything you need at tax time, without the work.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 rounded-full text-sm sm:text-base font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#ffffff", color: "#1a7a4a" }}
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-lg px-4 py-4 text-xs sm:text-sm leading-relaxed text-gray-700"
            style={{ backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb" }}
          >
            The information on this page is for general educational purposes only and does not constitute tax, legal, or financial advice.
            Tax laws change frequently and individual circumstances vary. EasyToGive is not a tax advisor. Always consult a qualified tax
            professional or CPA before making decisions about your charitable giving strategy. The 2026 figures on this page are based on
            current IRS guidance and the One Big Beautiful Bill Act — consult IRS.gov or a tax professional to confirm the most current limits.
          </div>
        </div>
      </section>
    </main>
  );
}

