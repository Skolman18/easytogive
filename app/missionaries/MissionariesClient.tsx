"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, MapPin, Globe } from "lucide-react";

interface Missionary {
  id: string;
  slug: string;
  full_name: string;
  photo_url: string;
  bio: string;
  mission_org: string;
  country: string;
  region: string;
  monthly_goal_cents: number;
  monthly_raised_cents: number;
  featured: boolean;
}

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function MissionariesClient({ missionaries }: { missionaries: Missionary[] }) {
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  const orgs = useMemo(() => {
    const s = new Set(missionaries.map((m) => m.mission_org).filter(Boolean));
    return Array.from(s).sort();
  }, [missionaries]);

  const regions = useMemo(() => {
    const s = new Set(missionaries.map((m) => m.region).filter(Boolean));
    return Array.from(s).sort();
  }, [missionaries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return missionaries.filter((m) => {
      if (
        q &&
        !m.full_name.toLowerCase().includes(q) &&
        !m.country.toLowerCase().includes(q) &&
        !m.mission_org.toLowerCase().includes(q)
      )
        return false;
      if (orgFilter && m.mission_org !== orgFilter) return false;
      if (regionFilter && m.region !== regionFilter) return false;
      return true;
    });
  }, [missionaries, search, orgFilter, regionFilter]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      {/* Page header */}
      <div className="bg-white border-b" style={{ borderColor: "#e5e1d8" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">
                Support Missionaries
              </h1>
              <p className="text-gray-500 text-base">
                Give directly to individuals serving around the world. One-time gifts or monthly
                support.
              </p>
            </div>
            <Link
              href="/missionaries/apply"
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
              style={{ color: "#1a7a4a", borderColor: "#1a7a4a" }}
            >
              Apply as a Missionary →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, country, or mission org..."
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm text-gray-900 outline-none focus:border-green-600 bg-white"
              style={{ borderColor: "#e5e1d8" }}
            />
          </div>
          {orgs.length > 0 && (
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="px-4 py-2.5 border rounded-xl text-sm text-gray-700 outline-none focus:border-green-600 bg-white"
              style={{ borderColor: "#e5e1d8" }}
            >
              <option value="">All Mission Orgs</option>
              {orgs.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}
          {regions.length > 0 && (
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-4 py-2.5 border rounded-xl text-sm text-gray-700 outline-none focus:border-green-600 bg-white"
              style={{ borderColor: "#e5e1d8" }}
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Globe className="w-12 h-12 mb-4" style={{ color: "#e5e1d8" }} />
            <p className="text-gray-400 text-sm">No missionaries found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((m) => {
              const pct =
                m.monthly_goal_cents > 0
                  ? Math.min(
                      Math.round((m.monthly_raised_cents / m.monthly_goal_cents) * 100),
                      100
                    )
                  : 0;
              return (
                <div
                  key={m.id}
                  className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  {/* Photo banner */}
                  <div className="relative h-40 overflow-hidden flex-shrink-0">
                    {m.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt={m.full_name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: "#f0ede6" }} />
                    )}
                    {m.featured && (
                      <span
                        className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.92)",
                          color: "#6b7280",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-display font-bold text-gray-900 text-lg leading-tight mb-1.5">
                      {m.full_name}
                    </h3>
                    {m.mission_org && (
                      <span
                        className="inline-flex self-start px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                        style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                      >
                        {m.mission_org}
                      </span>
                    )}
                    {(m.country || m.region) && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>{[m.country, m.region].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {m.bio && (
                      <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-2 flex-1">
                        {m.bio}
                      </p>
                    )}

                    {/* Monthly progress */}
                    {m.monthly_goal_cents > 0 && (
                      <div className="mb-3">
                        <div
                          className="w-full h-2 rounded-full overflow-hidden mb-1"
                          style={{ backgroundColor: "#e5e1d8" }}
                        >
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: "#1a7a4a" }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          {fmt(m.monthly_raised_cents)} of {fmt(m.monthly_goal_cents)}/mo · {pct}%
                        </p>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 mt-auto pt-2">
                      <Link
                        href={`/missionaries/${m.slug}`}
                        className="flex-1 text-center py-2 px-3 rounded-lg text-sm font-semibold border transition-colors hover:bg-gray-50"
                        style={{ color: "#1a7a4a", borderColor: "#1a7a4a" }}
                      >
                        Give Once
                      </Link>
                      <Link
                        href={`/missionaries/${m.slug}?type=monthly`}
                        className="flex-1 text-center py-2 px-3 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: "#1a7a4a" }}
                      >
                        Give Monthly
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
