import Link from "next/link";

interface Article {
  slug: string;
  category: string;
  categoryColor: string;
  title: string;
  date: string;
  excerpt: string;
}

const articles: Article[] = [
  {
    slug: "maximize-year-end-charitable-giving",
    category: "Giving Tips",
    categoryColor: "bg-emerald-100 text-emerald-800",
    title: "How to Maximize Your Year-End Charitable Giving",
    date: "December 15, 2025",
    excerpt:
      "The end of the year is the most popular time for charitable giving — and for good reason. Here's how to make sure every dollar goes further.",
  },
  {
    slug: "what-does-501c3-actually-mean",
    category: "Education",
    categoryColor: "bg-blue-100 text-blue-800",
    title: "What Does '501(c)(3)' Actually Mean?",
    date: "November 28, 2025",
    excerpt:
      "You've seen the term on every donation receipt, but what does 501(c)(3) status actually mean for you as a donor, and why does it matter?",
  },
  {
    slug: "organizations-making-a-difference",
    category: "Nonprofit Spotlight",
    categoryColor: "bg-amber-100 text-amber-800",
    title: "Meet the Organizations Making a Difference in Local Communities",
    date: "November 10, 2025",
    excerpt:
      "From food pantries to after-school tutoring programs, local nonprofits are doing extraordinary work. Here are a few we've been watching.",
  },
];

export default function BlogPage() {
  return (
    <main>
      {/* Header */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-5xl font-bold text-gray-900 mb-4">
            From the EasyToGive Blog
          </h1>
          <p className="text-xl text-gray-600">
            Giving tips, nonprofit spotlights, and platform updates.
          </p>
        </div>
      </section>

      {/* Article Grid */}
      <section className="py-16" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {articles.map((article) => (
              <article
                key={article.slug}
                className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col"
              >
                {/* Category badge */}
                <div className="px-6 pt-6">
                  <span
                    className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${article.categoryColor}`}
                  >
                    {article.category}
                  </span>
                </div>

                {/* Content */}
                <div className="px-6 py-4 flex-1 flex flex-col">
                  <time className="text-xs text-gray-400 mb-2 block">
                    {article.date}
                  </time>
                  <h2 className="font-display text-lg font-semibold text-gray-900 mb-3 leading-snug">
                    {article.title}
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    {article.excerpt}
                  </p>
                </div>

                {/* Footer link */}
                <div className="px-6 pb-6">
                  <Link
                    href={`/blog/${article.slug}`}
                    className="text-sm font-semibold transition-opacity hover:opacity-75"
                    style={{ color: "#1a7a4a" }}
                  >
                    Read More &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
