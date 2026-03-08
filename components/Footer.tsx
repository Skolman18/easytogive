import Link from "next/link";
import { Heart } from "lucide-react";

const FOOTER_LINKS = {
  Platform: [
    { href: "/discover", label: "Discover Orgs" },
    { href: "/portfolio", label: "My Portfolio" },
    { href: "/profile", label: "Giving History" },
  ],
  Company: [
    { href: "#", label: "About Us" },
    { href: "#", label: "How It Works" },
    { href: "#", label: "For Nonprofits" },
    { href: "#", label: "Blog" },
  ],
  Legal: [
    { href: "#", label: "Privacy Policy" },
    { href: "#", label: "Terms of Service" },
    { href: "#", label: "Tax FAQ" },
  ],
};

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#0d1117", color: "#9ca3af" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-display text-xl font-semibold text-white">
                EasyToGive
              </span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
              The charitable giving marketplace that makes donating to multiple
              causes as easy as building an investment portfolio.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
                {section}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-white"
                      style={{ color: "#6b7280" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: "#1e2530" }}
        >
          <p className="text-sm" style={{ color: "#4b5563" }}>
            &copy; {new Date().getFullYear()} EasyToGive, Inc. All rights reserved.
          </p>
          <p className="text-sm flex items-center gap-1" style={{ color: "#4b5563" }}>
            Made with{" "}
            <Heart className="w-3.5 h-3.5 fill-current" style={{ color: "#1a7a4a" }} />{" "}
            for generosity
          </p>
        </div>
      </div>
    </footer>
  );
}
