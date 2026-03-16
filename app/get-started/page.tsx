import Link from "next/link";
import { Heart, Building2, ArrowRight, CheckCircle } from "lucide-react";

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              <Heart className="w-4.5 h-4.5 text-white fill-white" />
            </div>
            <span className="font-display text-xl font-semibold text-gray-900">
              EasyToGive
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How would you like to get started?
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Choose the path that&apos;s right for you. It only takes a minute.
          </p>
        </div>

        {/* Choice cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Giver card */}
          <Link
            href="/signup/giver"
            className="group relative flex flex-col p-8 rounded-3xl border-2 bg-white transition-all hover:border-green-500 hover:shadow-lg"
            style={{ borderColor: "#e5e1d8" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 ease-out group-hover:scale-110"
              style={{ backgroundColor: "#e8f5ee" }}
            >
              <Heart className="w-7 h-7" style={{ color: "#1a7a4a" }} />
            </div>

            <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
              I want to give
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">
              Discover verified nonprofits and churches, build a giving portfolio,
              and donate to multiple causes with a single tax-deductible
              contribution.
            </p>

            <ul className="space-y-2 mb-8">
              {[
                "Browse 12,400+ verified organizations",
                "Donate to multiple causes at once",
                "One consolidated tax receipt",
                "Track your impact over time",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#1a7a4a" }} />
                  {item}
                </li>
              ))}
            </ul>

            <div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-sm transition-all group-hover:opacity-90"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              Create Giver Account
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Org card */}
          <Link
            href="/signup/organization"
            className="group relative flex flex-col p-8 rounded-3xl border-2 bg-white transition-all hover:border-blue-500 hover:shadow-lg"
            style={{ borderColor: "#e5e1d8" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 ease-out group-hover:scale-110"
              style={{ backgroundColor: "#eff6ff" }}
            >
              <Building2 className="w-7 h-7 text-blue-600" />
            </div>

            <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
              I represent an organization
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">
              List your nonprofit, church, or local cause on EasyToGive and
              reach thousands of motivated donors who are looking for causes
              like yours.
            </p>

            <ul className="space-y-2 mb-8">
              {[
                "Get discovered by new donors",
                "Earn a verified badge",
                "Receive consolidated payments",
                "Access donor insights",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-sm transition-all bg-blue-600 group-hover:opacity-90">
              Apply as an Organization
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-medium hover:underline" style={{ color: "#1a7a4a" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
