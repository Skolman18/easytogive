import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Tag } from "lucide-react";

interface Section {
  heading?: string;
  body: string;
}

interface Article {
  slug: string;
  category: string;
  categoryColor: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
  sections: Section[];
}

const ARTICLES: Article[] = [
  {
    slug: "maximize-year-end-charitable-giving",
    category: "Giving Tips",
    categoryColor: "bg-emerald-100 text-emerald-800",
    title: "How to Maximize Your Year-End Charitable Giving",
    date: "December 15, 2025",
    readTime: "5 min read",
    excerpt:
      "The end of the year is the most popular time for charitable giving — and for good reason. Here's how to make sure every dollar goes further.",
    sections: [
      {
        body: "More than 30% of all charitable donations in the United States are made in December, with a significant spike in the final days of the year. This isn't just habit — there are real financial and emotional reasons to give before December 31. But giving in a rush can mean missed opportunities. Here's how to be intentional about your year-end generosity.",
      },
      {
        heading: "1. Give before December 31 to claim the deduction this year",
        body: "For a donation to count toward your current-year tax return, it must be made — and processed — by December 31. For credit card donations, the date of the charge counts, not the date the nonprofit receives the funds. For checks, the postmark date matters. Don't wait until the last minute: many nonprofits' online systems get overwhelmed in late December.",
      },
      {
        heading: "2. Know your standard deduction threshold",
        body: "The 2025 standard deduction is $15,000 for single filers and $30,000 for married filing jointly. If your total itemized deductions — including charitable contributions, mortgage interest, and state taxes — don't exceed your standard deduction, you won't see a tax benefit from your donation. That doesn't mean you shouldn't give, but it changes the math. One strategy: 'bunch' donations by giving two years' worth in a single calendar year to push past the threshold.",
      },
      {
        heading: "3. Donate appreciated stock instead of cash",
        body: "If you hold stocks, mutual funds, or ETFs that have increased in value, donating shares directly to a nonprofit (rather than selling first and donating cash) lets you avoid capital gains tax entirely while still deducting the full fair-market value. This is one of the most tax-efficient ways to give, and many platforms — including EasyToGive — support stock donations.",
      },
      {
        heading: "4. Check if your employer matches donations",
        body: "Roughly 65% of Fortune 500 companies offer employee matching gift programs, yet an estimated $4–7 billion in matching funds goes unclaimed every year. Check with your HR department or use your company's giving portal to see if your contributions can be doubled or even tripled at no cost to you.",
      },
      {
        heading: "5. Spread your giving across multiple causes",
        body: "Rather than giving a single large gift to one organization, consider allocating your budget across several causes that matter to you. EasyToGive is built specifically for this — you can build a giving portfolio across food security, education, climate, and more, and donate to all of them in a single checkout. Diversifying your giving has the same benefits as diversifying investments: it reduces dependency on any single organization and lets you track the impact of your full philanthropic footprint.",
      },
      {
        heading: "6. Research before you give",
        body: "Year-end urgency can lead to hasty decisions. Before donating, verify that an organization is a registered 501(c)(3) — you can search the IRS Tax Exempt Organization Search database, or look for EasyToGive's verified badge on organization profiles. Check their publicly available financials to understand what percentage of donations go to programs versus overhead.",
      },
      {
        heading: "The bottom line",
        body: "Year-end giving doesn't have to be stressful. Set a total budget, identify the causes that resonate with you, confirm your organizations are legitimate, and give with confidence. The tax benefits are a bonus — but the impact is the point.",
      },
    ],
  },
  {
    slug: "what-does-501c3-actually-mean",
    category: "Education",
    categoryColor: "bg-blue-100 text-blue-800",
    title: "What Does '501(c)(3)' Actually Mean?",
    date: "November 28, 2025",
    readTime: "4 min read",
    excerpt:
      "You've seen the term on every donation receipt, but what does 501(c)(3) status actually mean for you as a donor, and why does it matter?",
    sections: [
      {
        body: "It's on every receipt, mentioned in every fundraising appeal, and referenced constantly in the world of charitable giving. But when most donors are asked to explain what '501(c)(3)' actually means, they draw a blank. Here's a plain-English breakdown.",
      },
      {
        heading: "It's a section of the tax code",
        body: "501(c)(3) refers to Section 501, subsection (c), paragraph (3) of the Internal Revenue Code. That section defines the criteria an organization must meet to be recognized as tax-exempt by the IRS. There are actually dozens of types of tax-exempt organizations — 501(c)(4) organizations are social welfare groups, 501(c)(6) organizations are trade associations — but 501(c)(3) is the specific category that covers most charities, religious organizations, schools, hospitals, and nonprofit scientific research institutions.",
      },
      {
        heading: "What makes an organization qualify",
        body: "To receive 501(c)(3) status, an organization must be organized and operated exclusively for one or more of these purposes: charitable, religious, educational, scientific, literary, testing for public safety, fostering national or international amateur sports competition, or preventing cruelty to children or animals. The organization must also not use its net earnings to benefit any private shareholder or individual, and it must not engage in substantial political lobbying or campaign activity.",
      },
      {
        heading: "What it means for you as a donor",
        body: "When you donate to a 501(c)(3) organization, your contribution is generally tax-deductible — meaning you can subtract it from your taxable income when you file your federal taxes (assuming you itemize deductions rather than taking the standard deduction). The organization is required to provide you with a written acknowledgment for any single donation of $250 or more. EasyToGive automatically generates and emails tax receipts for every donation you make through the platform.",
      },
      {
        heading: "Not all nonprofits are 501(c)(3)s",
        body: "This is an important and often misunderstood point. An organization can call itself a 'nonprofit' without being a 501(c)(3). State-incorporated nonprofits, for instance, may not have applied for federal tax-exempt status. Only contributions to IRS-recognized 501(c)(3) organizations are deductible on your federal return. You can verify any organization's status for free through the IRS Tax Exempt Organization Search at apps.irs.gov/app/eos.",
      },
      {
        heading: "What the organization gets in return",
        body: "Beyond donor tax deductions, 501(c)(3) status grants the organization its own tax exemption — it pays no federal income tax on money it raises for its charitable purposes. It also makes the organization eligible for grants from private foundations (most require 501(c)(3) status), reduces postal rates for bulk mailings, and in many states, exempts the organization from state and local sales or property taxes.",
      },
      {
        heading: "How EasyToGive handles this",
        body: "Every organization listed on EasyToGive has been confirmed as a valid 501(c)(3). Organizations that have completed our full verification review earn the 'EasyToGive Verified' badge, which means we've additionally confirmed their financial transparency and governance standards. When you donate through EasyToGive, you'll receive a receipt that includes all the information required by the IRS for your records.",
      },
    ],
  },
  {
    slug: "organizations-making-a-difference",
    category: "Nonprofit Spotlight",
    categoryColor: "bg-amber-100 text-amber-800",
    title: "Meet the Organizations Making a Difference in Local Communities",
    date: "November 10, 2025",
    readTime: "6 min read",
    excerpt:
      "From food pantries to after-school tutoring programs, local nonprofits are doing extraordinary work. Here are a few we've been watching.",
    sections: [
      {
        body: "National charities get most of the attention — and the donations. But some of the most impactful work happening right now is being done by small and mid-size nonprofits operating at the community level, often with lean budgets and volunteer-heavy teams. These organizations know their neighborhoods, their clients, and their needs in ways that larger institutions often don't.",
      },
      {
        heading: "Why local giving matters",
        body: "A dollar donated to a local food bank often goes further than a dollar donated to a national hunger organization. Local operations have lower overhead, deeper community relationships, and faster feedback loops — they can pivot quickly when needs change. Research from the Bridgespan Group suggests that unrestricted funding to local organizations can produce significantly better outcomes per dollar than restricted grants to large national programs.",
      },
      {
        heading: "The challenge: visibility",
        body: "The biggest obstacle for local nonprofits isn't a lack of impact — it's a lack of visibility. Most don't have a dedicated marketing staff. Their websites may be outdated. They're rarely covered by press. As a result, donors who want to give locally often don't know where to start. This is exactly the problem EasyToGive was built to solve: surfacing high-quality organizations that are doing genuine work but lack the platform to reach donors who share their values.",
      },
      {
        heading: "What to look for in a local nonprofit",
        body: "Before donating to any local organization, it's worth doing a little homework. Check that they're a registered 501(c)(3). Look at their most recent Form 990 (publicly available through ProPublica's Nonprofit Explorer or Candid) to understand their size, finances, and program expenses. Look for clear, specific descriptions of their programs — the best organizations can tell you exactly who they serve, how many people they reached last year, and what outcomes they measure.",
      },
      {
        heading: "Impact updates: the new standard",
        body: "One of the ways EasyToGive is working to raise the bar for accountability is through verified Impact Updates. Organizations on our platform can submit claims about their work — '1,200 meals served this month,' '47 students completed our tutoring program' — along with documentation to support those claims. Our team reviews the proof before any update goes live on the organization's public page. We think donors deserve more than just a thank-you email: they deserve to see the real-world outcomes their donations made possible.",
      },
      {
        heading: "Getting started",
        body: "If you want to make local giving a bigger part of your philanthropy, start by identifying the issues you care most about — food security, education, housing, mental health, the environment — and then search for organizations working on those issues in your area. EasyToGive's Discover page lets you filter by category and browse verified organizations. Every profile shows what the organization does, who they serve, and — for verified organizations — a record of their reported impact.",
      },
      {
        heading: "A final thought",
        body: "Generosity doesn't require a big budget. A $25 recurring monthly donation to a well-run local food pantry can provide a meaningful, consistent source of support that helps them plan and hire. The best donation isn't necessarily the largest one — it's the one that goes to an organization that will use it well.",
      },
    ],
  },
];

export async function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: `${article.title} — EasyToGive Blog`,
    description: article.excerpt,
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) notFound();

  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: "#e5e1d8" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <span
            className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 ${article.categoryColor}`}
          >
            {article.category}
          </span>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
            {article.title}
          </h1>

          <p className="text-lg text-gray-500 leading-relaxed mb-6">
            {article.excerpt}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {article.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {article.readTime}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border p-8 md:p-10 space-y-7" style={{ borderColor: "#e5e1d8" }}>
          {article.sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h2 className="font-display text-xl font-bold text-gray-900 mb-3">
                  {section.heading}
                </h2>
              )}
              <p className="text-gray-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-8 rounded-2xl p-8 text-center"
          style={{ backgroundColor: "#e8f5ee", border: "1px solid #86efac" }}
        >
          <h3 className="font-display text-xl font-bold text-gray-900 mb-2">
            Ready to put this into practice?
          </h3>
          <p className="text-gray-600 text-sm mb-5">
            Discover verified organizations and build your giving portfolio on EasyToGive.
          </p>
          <Link
            href="/discover"
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Discover Organizations
          </Link>
        </div>
      </div>
    </div>
  );
}
