"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Heart,
  Bookmark,
  Clock,
  Settings,
  FileText,
  TrendingUp,
  CheckCircle,
  Bell,
  CreditCard,
  Shield,
  User,
  Loader2,
  LayoutDashboard,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";
import AdminPanel from "@/components/AdminPanel";
import {
  GIVING_HISTORY,
  ORGANIZATIONS,
  WATCHLIST_IDS,
  formatCurrency,
  formatDate,
  getProgressPercent,
} from "@/lib/placeholder-data";

const ADMIN_EMAIL = "sethmitzel@gmail.com";

const ALL_BASE_TABS = [
  { id: "history", label: "Giving History", icon: Clock },
  { id: "tax", label: "Tax Documents", icon: FileText },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "settings", label: "Settings", icon: Settings },
];
const ADMIN_TAB = { id: "admin", label: "Admin", icon: LayoutDashboard };

const DASH_PREFS_KEY = "etg_dashboard_prefs";

interface DashPrefs {
  tabOrder: string[];
  hiddenTabs: string[];
  defaultTab: string;
}

function loadDashPrefs(): DashPrefs {
  try {
    const raw = localStorage.getItem(DASH_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tabOrder: ALL_BASE_TABS.map((t) => t.id), hiddenTabs: [], defaultTab: "history" };
}

function saveDashPrefs(prefs: DashPrefs) {
  localStorage.setItem(DASH_PREFS_KEY, JSON.stringify(prefs));
}

const CATEGORY_COLORS: Record<string, string> = {
  churches: "#7c3aed",
  "animal-rescue": "#f59e0b",
  nonprofits: "#3b82f6",
  education: "#6366f1",
  environment: "#10b981",
  local: "#f97316",
};

function groupByReceipt(records: typeof GIVING_HISTORY) {
  const groups: Record<string, typeof GIVING_HISTORY> = {};
  for (const r of records) {
    if (!groups[r.receiptId]) groups[r.receiptId] = [];
    groups[r.receiptId].push(r);
  }
  return Object.entries(groups).sort(
    (a, b) => new Date(b[1][0].date).getTime() - new Date(a[1][0].date).getTime()
  );
}

const TAX_DOCS = [
  { year: 2025, type: "Annual Giving Summary", size: "124 KB", ready: true },
  { year: 2025, type: "Charitable Contribution Receipt", size: "87 KB", ready: true },
  { year: 2024, type: "Annual Giving Summary", size: "118 KB", ready: true },
  { year: 2024, type: "Charitable Contribution Receipt", size: "91 KB", ready: true },
  { year: 2026, type: "Annual Giving Summary (YTD)", size: "—", ready: false },
];

const WATCHLIST_ORGS = ORGANIZATIONS.filter((o) => WATCHLIST_IDS.includes(o.id));

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#faf9f6" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
      </div>
    }>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const editOrgParam = searchParams.get("editOrg");

  const [activeTab, setActiveTab] = useState(tabParam || "history");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Profile data
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    location: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Notification prefs
  const [notifications, setNotifications] = useState({
    newOrgs: true,
    receipts: true,
    impact: false,
    newsletter: true,
  });

  // Dashboard customization
  const [dashPrefs, setDashPrefs] = useState<DashPrefs>({
    tabOrder: ALL_BASE_TABS.map((t) => t.id),
    hiddenTabs: [],
    defaultTab: "history",
  });

  useEffect(() => {
    const prefs = loadDashPrefs();
    setDashPrefs(prefs);
    // URL param overrides localStorage default
    setActiveTab(tabParam || prefs.defaultTab || "history");

    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/signin?redirectTo=/profile");
      } else {
        setUser(user);
        loadProfile(user.id);
        setLoadingUser(false);
      }
    });
  }, [router]);

  async function loadProfile(userId: string) {
    const { data } = await (createClient() as any)
      .from("users")
      .select("full_name, bio, avatar_url, location")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile({
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        location: data.location || "",
      });
    }
  }

  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    setProfileMsg(null);
    const { error } = await (createClient() as any)
      .from("users")
      .upsert({
        id: user.id,
        email: user.email,
        full_name: profile.full_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        location: profile.location,
      });
    setProfileSaving(false);
    if (error) {
      setProfileMsg({ text: "Error saving: " + error.message, ok: false });
    } else {
      setProfileMsg({ text: "Profile saved!", ok: true });
      setTimeout(() => setProfileMsg(null), 3000);
    }
  }

  // Derived display values
  const displayName = profile.full_name || user?.email || "";
  const memberSince = user?.created_at
    ? new Date(user.created_at).getFullYear()
    : 2024;
  const initials = (user?.email ?? "??").slice(0, 2).toUpperCase();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Build ordered visible tabs
  const orderedBaseTabs = dashPrefs.tabOrder
    .map((id) => ALL_BASE_TABS.find((t) => t.id === id))
    .filter(Boolean)
    .filter((t) => !dashPrefs.hiddenTabs.includes(t!.id)) as typeof ALL_BASE_TABS;
  const settingsTab = ALL_BASE_TABS.find((t) => t.id === "settings")!;
  const visibleTabs = orderedBaseTabs.includes(settingsTab)
    ? orderedBaseTabs
    : [...orderedBaseTabs, settingsTab];
  const TABS = isAdmin ? [...visibleTabs, ADMIN_TAB] : visibleTabs;

  const totalGiven = GIVING_HISTORY.reduce((s, g) => s + g.amount, 0);
  const orgsSupported = new Set(GIVING_HISTORY.map((g) => g.orgId)).size;
  const receiptGroups = groupByReceipt(GIVING_HISTORY);

  // Dashboard pref helpers
  function updateDashPrefs(updates: Partial<DashPrefs>) {
    const next = { ...dashPrefs, ...updates };
    setDashPrefs(next);
    saveDashPrefs(next);
  }

  function moveTab(id: string, direction: -1 | 1) {
    const order = [...dashPrefs.tabOrder];
    const idx = order.indexOf(id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    updateDashPrefs({ tabOrder: order });
  }

  function toggleHideTab(id: string) {
    if (id === "settings") return; // settings always visible
    const hidden = dashPrefs.hiddenTabs.includes(id)
      ? dashPrefs.hiddenTabs.filter((h) => h !== id)
      : [...dashPrefs.hiddenTabs, id];
    let defaultTab = dashPrefs.defaultTab;
    if (hidden.includes(defaultTab)) {
      defaultTab = dashPrefs.tabOrder.find((t) => !hidden.includes(t)) || "settings";
    }
    updateDashPrefs({ hiddenTabs: hidden, defaultTab });
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#faf9f6" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#faf9f6" }} className="min-h-screen">
      {/* Header */}
      <div style={{ backgroundColor: "#0d1117" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="flex items-center gap-5 mb-6">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-white">
                {displayName}
              </h1>
              {profile.location && (
                <p className="text-gray-400 text-sm">{profile.location}</p>
              )}
              <p className="text-gray-500 text-sm">Member since {memberSince}</p>
            </div>
          </div>

          {/* Complete profile prompt */}
          {!profile.full_name && (
            <button
              onClick={() => setActiveTab("settings")}
              className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: "#1a3d28", color: "#4ade80" }}
            >
              <AlertCircle className="w-4 h-4" />
              Complete your profile — add your name, bio, and photo
            </button>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 md:gap-12 max-w-lg">
            {[
              { label: "Total Given", value: formatCurrency(totalGiven) },
              { label: "Orgs Supported", value: orgsSupported.toString() },
              { label: "Member Since", value: memberSince.toString() },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="font-display text-2xl font-bold"
                  style={{ color: "#2db673" }}
                >
                  {s.value}
                </div>
                <div className="text-sm" style={{ color: "#6b7280" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? "text-white border-green-500"
                      : "text-gray-500 border-transparent hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Giving History tab ── */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div
              className="rounded-2xl border bg-white p-6"
              style={{ borderColor: "#e5e1d8" }}
            >
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                Your Giving Impact
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Total donated", value: formatCurrency(totalGiven), sub: "All time" },
                  { label: "This year (2026)", value: formatCurrency(150), sub: "2 donations" },
                  { label: "Organizations", value: orgsSupported.toString(), sub: "Supported" },
                  { label: "Categories", value: "5", sub: "Different causes" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div
                      className="font-display text-3xl font-bold mb-0.5"
                      style={{ color: "#1a7a4a" }}
                    >
                      {item.value}
                    </div>
                    <div className="text-sm font-medium text-gray-700">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-4">
                Donation History
              </h2>
              <div className="space-y-4">
                {receiptGroups.map(([receiptId, records]) => {
                  const total = records.reduce((s, r) => s + r.amount, 0);
                  return (
                    <div
                      key={receiptId}
                      className="bg-white rounded-2xl border overflow-hidden"
                      style={{ borderColor: "#e5e1d8" }}
                    >
                      <div
                        className="px-5 py-3 flex items-center justify-between border-b"
                        style={{ backgroundColor: "#faf9f6", borderColor: "#e5e1d8" }}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4" style={{ color: "#1a7a4a" }} />
                          <div>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatDate(records[0].date)}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              Receipt #{receiptId}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">
                            {formatCurrency(total)}
                          </span>
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                            style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                          >
                            <Download className="w-3 h-3" />
                            Receipt
                          </button>
                        </div>
                      </div>
                      {records.map((record, i) => (
                        <div
                          key={record.id}
                          className={`px-5 py-3.5 flex items-center justify-between ${
                            i < records.length - 1 ? "border-b" : ""
                          }`}
                          style={{ borderColor: "#f0ede6" }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[record.category] || "#1a7a4a" }}
                            />
                            <Link
                              href={`/org/${record.orgId}`}
                              className="text-sm font-medium text-gray-900 hover:text-green-700 transition-colors truncate"
                            >
                              {record.orgName}
                            </Link>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 ml-4 flex-shrink-0">
                            {formatCurrency(record.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Tax Documents tab ── */}
        {activeTab === "tax" && (
          <div className="space-y-6">
            <div
              className="rounded-2xl border p-5 flex items-start gap-4"
              style={{ borderColor: "#86efac", backgroundColor: "#f0fdf4" }}
            >
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#1a7a4a" }} />
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  All donations are tax-deductible
                </p>
                <p className="text-sm text-gray-600">
                  EasyToGive consolidates your giving records and generates IRS-compliant
                  receipts. Download these for your records or share with your tax preparer.
                </p>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl border overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
              >
                <h2 className="font-display font-semibold text-gray-900">Tax Documents</h2>
              </div>
              {TAX_DOCS.map((doc, i) => (
                <div
                  key={`${doc.year}-${doc.type}`}
                  className={`px-6 py-4 flex items-center justify-between ${
                    i < TAX_DOCS.length - 1 ? "border-b" : ""
                  }`}
                  style={{ borderColor: "#f0ede6" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: doc.ready ? "#e8f5ee" : "#f0ede6" }}
                    >
                      <FileText
                        className="w-4 h-4"
                        style={{ color: doc.ready ? "#1a7a4a" : "#9ca3af" }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {doc.year} — {doc.type}
                      </div>
                      <div className="text-xs text-gray-500">
                        {doc.ready ? `PDF · ${doc.size}` : "Not yet available"}
                      </div>
                    </div>
                  </div>
                  {doc.ready ? (
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                      style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 px-3 py-1.5">
                      Available Dec 31
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Watchlist tab ── */}
        {activeTab === "watchlist" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-gray-900">
                Saved Organizations ({WATCHLIST_ORGS.length})
              </h2>
              <Link
                href="/discover"
                className="text-sm font-medium hover:underline"
                style={{ color: "#1a7a4a" }}
              >
                Discover more →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {WATCHLIST_ORGS.map((org) => {
                const progress = getProgressPercent(org.raised, org.goal);
                return (
                  <div
                    key={org.id}
                    className="bg-white rounded-2xl border overflow-hidden card-hover"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    <div className="relative h-36 overflow-hidden bg-gray-100">
                      <img
                        src={org.imageUrl}
                        alt={org.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-3 right-3 p-1.5 rounded-lg"
                        style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "white" }}
                        aria-label="Remove from watchlist"
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link
                          href={`/org/${org.id}`}
                          className="font-display font-semibold text-gray-900 hover:text-green-700 transition-colors leading-tight"
                        >
                          {org.name}
                        </Link>
                        {org.verified && (
                          <CheckCircle
                            className="w-4 h-4 flex-shrink-0 mt-0.5"
                            style={{ color: "#1a7a4a" }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{org.location}</p>
                      <div
                        className="w-full rounded-full h-1.5 mb-1.5"
                        style={{ backgroundColor: "#e5e1d8" }}
                      >
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${progress}%`, backgroundColor: "#1a7a4a" }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>{formatCurrency(org.raised)} raised</span>
                        <span>{progress}%</span>
                      </div>
                      <Link
                        href={`/org/${org.id}`}
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                      >
                        <Heart className="w-3.5 h-3.5" />
                        Donate
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {WATCHLIST_ORGS.length === 0 && (
              <div className="text-center py-20">
                <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                  No saved organizations yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Click the bookmark icon on any organization to save it here.
                </p>
                <Link
                  href="/discover"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  Discover Causes
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Admin tab ── */}
        {activeTab === "admin" && isAdmin && <AdminPanel editOrgId={editOrgParam ?? undefined} />}

        {/* ── Settings tab ── */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            {/* Profile Information */}
            <div
              className="bg-white rounded-2xl border overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              <div
                className="px-6 py-4 border-b flex items-center gap-2"
                style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
              >
                <User className="w-4 h-4 text-gray-500" />
                <h2 className="font-display font-semibold text-gray-900">Profile Information</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Avatar preview */}
                <div className="flex items-center gap-4 pb-2">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : initials}
                  </div>
                  <div className="text-sm text-gray-500">
                    {profile.avatar_url
                      ? "Profile picture set"
                      : "No profile picture — paste an image URL below"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                    style={{ borderColor: "#e5e1d8" }}
                    placeholder="Jane Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Profile Picture URL
                  </label>
                  <input
                    type="url"
                    value={profile.avatar_url}
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                    style={{ borderColor: "#e5e1d8" }}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors resize-none"
                    style={{ borderColor: "#e5e1d8" }}
                    placeholder="Tell us a little about yourself and why you give…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                    style={{ borderColor: "#e5e1d8" }}
                    placeholder="Denver, CO"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email ?? ""}
                    readOnly
                    className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-400 bg-gray-50 outline-none"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                </div>

                {profileMsg && (
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      profileMsg.ok
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {profileMsg.ok
                      ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    {profileMsg.text}
                  </div>
                )}

                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {profileSaving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </div>

            {/* Dashboard Customization */}
            <div
              className="bg-white rounded-2xl border overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              <div
                className="px-6 py-4 border-b flex items-center gap-2"
                style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
              >
                <LayoutDashboard className="w-4 h-4 text-gray-500" />
                <h2 className="font-display font-semibold text-gray-900">Customize Dashboard</h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Tab visibility & order</p>
                  <div className="space-y-2">
                    {dashPrefs.tabOrder.map((tabId, idx) => {
                      const tab = ALL_BASE_TABS.find((t) => t.id === tabId);
                      if (!tab) return null;
                      const isSettings = tabId === "settings";
                      const hidden = dashPrefs.hiddenTabs.includes(tabId);
                      return (
                        <div
                          key={tabId}
                          className="flex items-center gap-3 p-3 rounded-xl border"
                          style={{ borderColor: "#e5e1d8", backgroundColor: hidden ? "#fafafa" : "white" }}
                        >
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveTab(tabId, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveTab(tabId, 1)}
                              disabled={idx === dashPrefs.tabOrder.length - 1}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className={`text-sm font-medium flex-1 ${hidden ? "text-gray-400 line-through" : "text-gray-900"}`}>
                            {tab.label}
                          </span>
                          {isSettings ? (
                            <span className="text-xs text-gray-400 px-2">Always visible</span>
                          ) : (
                            <button
                              onClick={() => toggleHideTab(tabId)}
                              className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${hidden ? "bg-gray-200" : ""}`}
                              style={!hidden ? { backgroundColor: "#1a7a4a" } : {}}
                              role="switch"
                              aria-checked={!hidden}
                            >
                              <span
                                className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${!hidden ? "translate-x-5" : "translate-x-0.5"}`}
                              />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default tab when you open your profile
                  </label>
                  <select
                    value={dashPrefs.defaultTab}
                    onChange={(e) => updateDashPrefs({ defaultTab: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors bg-white"
                    style={{ borderColor: "#e5e1d8" }}
                  >
                    {dashPrefs.tabOrder
                      .filter((id) => !dashPrefs.hiddenTabs.includes(id))
                      .map((id) => {
                        const tab = ALL_BASE_TABS.find((t) => t.id === id);
                        return tab ? (
                          <option key={id} value={id}>{tab.label}</option>
                        ) : null;
                      })}
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div
              className="bg-white rounded-2xl border overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              <div
                className="px-6 py-4 border-b flex items-center gap-2"
                style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
              >
                <Bell className="w-4 h-4 text-gray-500" />
                <h2 className="font-display font-semibold text-gray-900">Notification Preferences</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                {[
                  { key: "newOrgs" as const, label: "New verified organizations", desc: "When new orgs in your categories are verified" },
                  { key: "receipts" as const, label: "Donation receipts", desc: "Immediate email after each donation" },
                  { key: "impact" as const, label: "Impact updates", desc: "Monthly updates from organizations you support" },
                  { key: "newsletter" as const, label: "EasyToGive newsletter", desc: "Giving tips, featured causes, and platform news" },
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifications[item.key] ? "" : "bg-gray-200"}`}
                      style={notifications[item.key] ? { backgroundColor: "#1a7a4a" } : {}}
                      role="switch"
                      aria-checked={notifications[item.key]}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications[item.key] ? "translate-x-5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div
              className="bg-white rounded-2xl border overflow-hidden"
              style={{ borderColor: "#e5e1d8" }}
            >
              <div
                className="px-6 py-4 border-b flex items-center gap-2"
                style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
              >
                <CreditCard className="w-4 h-4 text-gray-500" />
                <h2 className="font-display font-semibold text-gray-900">Payment Methods</h2>
              </div>
              <div className="px-6 py-5">
                <div
                  className="flex items-center justify-between p-3 rounded-xl border mb-4"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: "#1a56db" }}
                    >
                      VISA
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Visa ending in 4242</div>
                      <div className="text-xs text-gray-500">Expires 08/2028</div>
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                  >
                    Default
                  </span>
                </div>
                <button
                  className="text-sm font-medium flex items-center gap-1.5"
                  style={{ color: "#1a7a4a" }}
                >
                  + Add payment method
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
