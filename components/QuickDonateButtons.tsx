"use client";

import Link from "next/link";

const AMOUNTS = [25, 50, 100];

export default function QuickDonateButtons() {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {AMOUNTS.map((amt) => (
        <Link
          key={amt}
          href="/portfolio"
          className="py-2 rounded-lg text-sm font-semibold text-gray-700 text-center transition-all hover:text-white"
          style={{ backgroundColor: "#f0ede6" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#1a7a4a";
            (e.currentTarget as HTMLAnchorElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f0ede6";
            (e.currentTarget as HTMLAnchorElement).style.color = "#374151";
          }}
        >
          ${amt}
        </Link>
      ))}
    </div>
  );
}
