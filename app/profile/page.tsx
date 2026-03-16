"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
  Receipt,
  ExternalLink,
  X,
  RefreshCw,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";
import dynamic from "next/dynamic";
const AdminPanel = dynamic(() => import("@/components/AdminPanel"), { ssr: false });
import Toggle from "@/components/Toggle";
import GivingGoalCard from "@/components/GivingGoalCard";
import YourImpactSection from "@/components/YourImpactSection";
import {
  formatCurrency,
  formatDate,
  getProgressPercent,
} from "@/lib/placeholder-data";
import { ADMIN_EMAIL } from "@/lib/admin";

interface DonationRecord {
  id: string;
  org_id: string;
  org_name: string;
  org_image_url: string | null;
  org_ein: string | null;
  org_category: string | null;
  amount: number;
  fee_amount: number;
  fee_covered: boolean;
  donated_at: string;
  receipt_id: string | null;
}

interface WatchlistOrg {
  id: string;
  name: string;
  image_url: string | null;
  cover_url: string | null;
  location: string | null;
  verified: boolean;
  raised: number;
  goal: number;
  category: string | null;
}

function downloadReceiptPDF(record: DonationRecord, user: { email?: string } | null, donorName: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const date = new Date(record.donated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const total = (record.amount + (record.fee_covered ? record.fee_amount : 0)).toFixed(2);
  win.document.write(`<!DOCTYPE html><html><head><title>EasyToGive Receipt</title><style>
    body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#111;padding:0 20px}
    h1{color:#1a7a4a;margin-bottom:2px}h2{margin-top:4px;font-size:20px}
    .sub{color:#6b7280;font-size:13px;margin-bottom:20px}
    .divider{border:none;border-top:1px solid #e5e1d8;margin:16px 0}
    .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f0ede6;font-size:14px}
    .label{color:#6b7280}.value{font-weight:500}
    .total-row{display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:15px;color:#1a7a4a}
    .note{font-size:11px;color:#6b7280;margin-top:20px;line-height:1.6}
    .irs-link{color:#1a7a4a}
    @media print{.no-print{display:none}}
    .btn{display:inline-block;margin-top:20px;padding:10px 24px;background:#1a7a4a;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer}
  </style></head><body>
    <h1>EasyToGive</h1><h2>Donation Receipt</h2>
    <p class="sub">This serves as your official donation receipt for tax purposes.</p>
    <hr class="divider" />
    <div class="row"><span class="label">Receipt Number</span><span class="value">${record.receipt_id ?? record.id.slice(0, 8).toUpperCase()}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
    <div class="row"><span class="label">Donor Name</span><span class="value">${donorName || "—"}</span></div>
    <div class="row"><span class="label">Donor Email</span><span class="value">${user?.email || "—"}</span></div>
    <div class="row"><span class="label">Organization</span><span class="value">${record.org_name}</span></div>
    <div class="row"><span class="label">Organization EIN</span><span class="value">${record.org_ein ?? "See organization directly"}</span></div>
    <div class="row"><span class="label">Donation Amount</span><span class="value">$${record.amount.toFixed(2)}</span></div>
    <div class="row"><span class="label">Platform Fee</span><span class="value">$${record.fee_amount.toFixed(2)} ${record.fee_covered ? "(covered by you)" : "(covered by EasyToGive)"}</span></div>
    <div class="total-row"><span>Total Charged</span><span>$${total}</span></div>
    <hr class="divider" />
    <p class="note">EasyToGive is a technology platform. Please verify the tax-exempt status of the organization you donated to before claiming a deduction. Political donations are never tax deductible.<br /><a class="irs-link" href="https://apps.irs.gov/app/eos/">Verify organization status → apps.irs.gov/app/eos/</a></p>
    <button class="btn no-print" onclick="window.print()">Print / Save as PDF</button>
  </body></html>`);
  win.document.close();
}

function downloadYearSummaryPDF(records: DonationRecord[], year: string, user: { email?: string } | null, donorName: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const total = records.reduce((s, r) => s + r.amount, 0).toFixed(2);
  const rows = records.map((r) => {
    const date = new Date(r.donated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `<tr><td>${date}</td><td>${r.org_name}</td><td>$${r.amount.toFixed(2)}</td><td>${r.fee_covered ? "Yes" : "No"}</td></tr>`;
  }).join("");
  win.document.write(`<!DOCTYPE html><html><head><title>EasyToGive Giving Summary ${year}</title><style>
    body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#111;padding:0 20px}
    h1{color:#1a7a4a}h2{font-size:16px;color:#374151}
    table{width:100%;border-collapse:collapse;margin:20px 0;font-size:13px}
    th{background:#f3f4f6;text-align:left;padding:8px 10px;border-bottom:2px solid #e5e1d8}
    td{padding:7px 10px;border-bottom:1px solid #f0ede6}
    .total{font-weight:700;font-size:15px;color:#1a7a4a;margin-top:10px}
    .note{font-size:11px;color:#6b7280;margin-top:20px;line-height:1.6}
    .irs-link{color:#1a7a4a}
    @media print{.no-print{display:none}}
    .btn{display:inline-block;margin-top:20px;padding:10px 24px;background:#1a7a4a;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer}
  </style></head><body>
    <h1>EasyToGive</h1>
    <h2>Giving Summary — ${year}</h2>
    <p style="font-size:14px;color:#374151">Donor: ${donorName || user?.email || "—"} &nbsp;|&nbsp; Email: ${user?.email || "—"}</p>
    <p class="total">Total donated: $${total}</p>
    <table><thead><tr><th>Date</th><th>Organization</th><th>Amount</th><th>Fee Covered</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="note">EasyToGive is a technology platform. Please verify the tax-exempt status of each organization before claiming a deduction. Political donations are never tax deductible.<br /><a class="irs-link" href="https://apps.irs.gov/app/eos/">Verify organization status → apps.irs.gov/app/eos/</a></p>
    <button class="btn no-print" onclick="window.print()">Print / Save as PDF</button>
  </body></html>`);
  win.document.close();
}

// ─── Compact avatar upload ────────────────────────────────────────────────────
function AvatarUpload({
  value,
  initials,
  onChange,
}: {
  value: string;
  initials: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    try {
      const { createClient: createBrowser } = await import("@/lib/supabase-browser");
      const supabase = createBrowser() as any;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("images").upload(path, file, { cacheControl: "3600", upsert: false });
      if (!error) {
        const { data } = supabase.storage.from("images").getPublicUrl(path);
        onChange(data.publicUrl);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0 overflow-hidden ring-2"
        style={{ backgroundColor: "#1a7a4a", ringColor: "#1a7a4a" } as any}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : value ? (
          <img src={value} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          initials
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium hover:underline"
          style={{ color: "#1a7a4a" }}
        >
          Change photo
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="block text-xs text-gray-400 hover:text-gray-600 mt-1"
          >
            Remove
          </button>
        )}
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · max 5 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

const ALL_BASE_TABS = [
  { id: "history", label: "Giving History", icon: Clock },
  { id: "receipts", label: "Receipts", icon: Receipt },
  { id: "recurring", label: "Recurring Giving", icon: RefreshCw },
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


function groupByReceipt(records: DonationRecord[]) {
  const groups: Record<string, DonationRecord[]> = {};
  for (const r of records) {
    const key = r.receipt_id ?? r.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.entries(groups).sort(
    (a, b) => new Date(b[1][0].donated_at).getTime() - new Date(a[1][0].donated_at).getTime()
  );
}


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

  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    location: "",
    city: "",
    state: "",
    zip: "",
  });
  const [userCauses, setUserCauses] = useState<string[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [notifications, setNotifications] = useState({
    newOrgs: true,
    receipts: true,
    impact: false,
    newsletter: true,
  });

  const [dashPrefs, setDashPrefs] = useState<DashPrefs>({
    tabOrder: ALL_BASE_TABS.map((t) => t.id),
    hiddenTabs: [],
    defaultTab: "history",
  });

  const [receiptsYear, setReceiptsYear] = useState<number>(2026);
  const [donationRecords, setDonationRecords] = useState<DonationRecord[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<DonationRecord | null>(null);
  const [allDonations, setAllDonations] = useState<DonationRecord[]>([]);
  const [watchlistOrgs, setWatchlistOrgs] = useState<WatchlistOrg[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  const [recurringDonations, setRecurringDonations] = useState<{
    id: string; org_id: string; org_name: string;
    amount_cents: number; frequency: string;
    stripe_subscription_id: string | null; created_at: string;
  }[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadDashPrefs();
    setDashPrefs(prefs);
    setActiveTab(tabParam || prefs.defaultTab || "history");

    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/signin?redirectTo=/profile");
      } else {
        setUser(user);
        loadProfile(user.id);
        loadDonations(user.id, receiptsYear);
        loadAllDonations(user.id);
        loadRecurring(user.id);
        loadWatchlist(user.id);
        setLoadingUser(false);
      }
    });
  }, [router]);

  async function loadDonations(userId: string, year: number) {
    setLoadingReceipts(true);
    const supabase = createClient() as any;
    let query = supabase
      .from("donations")
      .select("id, org_id, amount, fee_amount, fee_covered, donated_at, receipt_id, organizations(name, image_url, ein, category)")
      .eq("user_id", userId)
      .order("donated_at", { ascending: false });
    if (year !== 0) {
      query = query
        .gte("donated_at", `${year}-01-01`)
        .lt("donated_at", `${year + 1}-01-01`);
    }
    const { data } = await query;
    if (data) {
      setDonationRecords(
        data.map((d: any) => ({
          id: d.id,
          org_id: d.org_id,
          org_name: d.organizations?.name ?? "Unknown Organization",
          org_image_url: d.organizations?.image_url ?? null,
          org_ein: d.organizations?.ein ?? null,
          org_category: d.organizations?.category ?? null,
          amount: (d.amount ?? 0) / 100,
          fee_amount: (d.fee_amount ?? 0) / 100,
          fee_covered: d.fee_covered ?? false,
          donated_at: d.donated_at,
          receipt_id: d.receipt_id ?? null,
        }))
      );
    }
    setLoadingReceipts(false);
  }

  async function loadAllDonations(userId: string) {
    const supabase = createClient() as any;
    const { data } = await supabase
      .from("donations")
      .select("id, org_id, amount, fee_amount, fee_covered, donated_at, receipt_id, organizations(name, image_url, ein, category)")
      .eq("user_id", userId)
      .order("donated_at", { ascending: false });
    if (data) {
      setAllDonations(
        data.map((d: any) => ({
          id: d.id,
          org_id: d.org_id,
          org_name: d.organizations?.name ?? "Unknown Organization",
          org_image_url: d.organizations?.image_url ?? null,
          org_ein: d.organizations?.ein ?? null,
          org_category: d.organizations?.category ?? null,
          amount: (d.amount ?? 0) / 100,
          fee_amount: (d.fee_amount ?? 0) / 100,
          fee_covered: d.fee_covered ?? false,
          donated_at: d.donated_at,
          receipt_id: d.receipt_id ?? null,
        }))
      );
    }
  }

  async function loadWatchlist(userId: string) {
    setLoadingWatchlist(true);
    const supabase = createClient() as any;
    const { data } = await supabase
      .from("watchlist")
      .select("org_id, organizations(id, name, image_url, cover_url, location, verified, raised, goal, category)")
      .eq("user_id", userId);
    if (data) {
      setWatchlistOrgs(
        data
          .filter((row: any) => row.organizations)
          .map((row: any) => ({
            id: row.organizations.id,
            name: row.organizations.name,
            image_url: row.organizations.image_url ?? null,
            cover_url: row.organizations.cover_url ?? null,
            location: row.organizations.location ?? null,
            verified: row.organizations.verified ?? false,
            raised: row.organizations.raised ?? 0,
            goal: row.organizations.goal ?? 0,
            category: row.organizations.category ?? null,
          }))
      );
    }
    setLoadingWatchlist(false);
  }

  async function loadRecurring(userId: string) {
    const { data } = await (createClient() as any)
      .from("recurring_donations")
      .select("id, org_id, org_name, amount_cents, frequency, stripe_subscription_id, created_at")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (data) setRecurringDonations(data);
  }

  async function cancelRecurring(id: string) {
    if (!user) return;
    setCancellingId(id);
    try {
      await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurringDonationId: id }),
      });
      setRecurringDonations((prev) => prev.filter((r) => r.id !== id));
    } catch { /* silent */ }
    setCancellingId(null);
  }

  // reload receipts when year changes
  useEffect(() => {
    if (user) loadDonations(user.id, receiptsYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, receiptsYear]);

  async function loadProfile(userId: string) {
    const { data } = await (createClient() as any)
      .from("users")
      .select("full_name, bio, avatar_url, location, city, state, zip, causes")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile({
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        location: data.location || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
      });
      setUserCauses(data.causes || []);
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
        city: profile.city,
        state: profile.state,
        zip: profile.zip,
        causes: userCauses,
      });
    setProfileSaving(false);
    if (error) {
      setProfileMsg({ text: "Error saving: " + error.message, ok: false });
    } else {
      setProfileMsg({ text: "Profile saved!", ok: true });
      setTimeout(() => setProfileMsg(null), 3000);
    }
  }

  const displayName = profile.full_name || user?.email?.split("@")[0] || "";
  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : 2024;
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email ?? "??").slice(0, 2).toUpperCase();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const orderedBaseTabs = dashPrefs.tabOrder
    .map((id) => ALL_BASE_TABS.find((t) => t.id === id))
    .filter(Boolean)
    .filter((t) => !dashPrefs.hiddenTabs.includes(t!.id)) as typeof ALL_BASE_TABS;
  const settingsTab = ALL_BASE_TABS.find((t) => t.id === "settings")!;
  const visibleTabs = orderedBaseTabs.includes(settingsTab)
    ? orderedBaseTabs
    : [...orderedBaseTabs, settingsTab];
  const TABS = isAdmin ? [...visibleTabs, ADMIN_TAB] : visibleTabs;

  const currentYear = new Date().getFullYear().toString();
  const lastYear = (new Date().getFullYear() - 1).toString();
  const totalGiven = allDonations.reduce((s, g) => s + g.amount, 0);
  const orgsSupported = new Set(allDonations.map((g) => g.org_id)).size;
  const receiptGroups = groupByReceipt(allDonations);
  const thisYearTotal = allDonations.filter((g) => g.donated_at.startsWith(currentYear)).reduce((s, g) => s + g.amount, 0);
  const lastYearTotal = allDonations.filter((g) => g.donated_at.startsWith(lastYear)).reduce((s, g) => s + g.amount, 0);
  const categoryTotals: Record<string, number> = allDonations.reduce((acc, g) => {
    const cat = g.org_category ?? "other";
    acc[cat] = (acc[cat] || 0) + g.amount;
    return acc;
  }, {} as Record<string, number>);
  const categoriesCount = Object.keys(categoryTotals).length;
  const categoryBreakdown = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({ cat, amt, pct: totalGiven > 0 ? Math.round((amt / totalGiven) * 100) : 0 }));
  // Unique years with donations for tax docs
  const donationYears = Array.from(new Set(allDonations.map((d) => new Date(d.donated_at).getFullYear())))
    .sort((a, b) => b - a);

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
    if (id === "settings") return;
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

      {/* ── Profile Header ── */}
      <div className="bg-white border-b" style={{ borderColor: "#e5e1d8" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Complete-profile hint */}
          {!profile.full_name && (
            <button
              onClick={() => setActiveTab("settings")}
              className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl text-sm font-medium w-full sm:w-auto"
              style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a", border: "1px solid #b6dfc8" }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Complete your profile — add your name, bio, and photo
            </button>
          )}

          {/* Avatar + name + stats row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : initials}
            </div>

            {/* Name + email */}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">
                {displayName}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
            </div>

            {/* Stats inline */}
            <div className="flex items-center gap-6 sm:gap-8 flex-shrink-0">
              {[
                { label: "Total Given", value: formatCurrency(totalGiven) },
                { label: "Orgs Supported", value: orgsSupported.toString() },
                { label: "Member Since", value: memberSince.toString() },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-display text-xl font-bold" style={{ color: "#1a7a4a" }}>
                    {s.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? "border-green-600 text-green-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  style={active ? { borderColor: "#1a7a4a", color: "#1a7a4a" } : {}}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Giving History — 2-column layout */}
        {activeTab === "history" && (
          <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">

            {/* ── LEFT: Donation history list ── */}
            <div className="space-y-6">
              {user && <YourImpactSection userId={user.id} />}
              <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Donation History
              </h2>
              <div className="space-y-3">
                {receiptGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No donations yet. Start giving today!</p>
                </div>
              ) : receiptGroups.map(([receiptId, records]) => {
                  const total = records.reduce((s, r) => s + r.amount, 0);
                  return (
                    <div
                      key={receiptId}
                      className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                      style={{ borderColor: "#e5e1d8" }}
                    >
                      {/* Card header */}
                      <div
                        className="px-4 py-2.5 flex items-center justify-between border-b"
                        style={{ backgroundColor: "#faf9f6", borderColor: "#e5e1d8" }}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1a7a4a" }} />
                          <span className="text-sm font-semibold text-gray-900">
                            {formatDate(records[0].donated_at)}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            #{receiptId.slice(0, 12)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(total)}
                          </span>
                          <button
                            onClick={() => downloadReceiptPDF(records[0], user, profile.full_name)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
                            style={{ borderColor: "#e5e1d8", color: "#6b7280" }}
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>
                        </div>
                      </div>

                      {/* Org rows */}
                      {records.map((record, i) => (
                        <div
                          key={record.id}
                          className={`px-4 py-2.5 flex items-center justify-between ${i < records.length - 1 ? "border-b" : ""}`}
                          style={{ borderColor: "#f5f3ef" }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400"
                            />
                            <Link
                              href={`/org/${record.org_id}`}
                              className="text-sm text-gray-800 hover:text-green-700 transition-colors truncate"
                            >
                              {record.org_name}
                            </Link>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 ml-4 flex-shrink-0 tabular-nums">
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

            {/* ── RIGHT: Sticky stats sidebar ── */}
            <div className="space-y-4 lg:sticky lg:top-20">

              {/* Giving Goal */}
              {user && <GivingGoalCard userId={user.id} />}

              {/* Giving Impact — 2×2 grid */}
              <div
                className="bg-white rounded-2xl border shadow-sm p-4"
                style={{ borderColor: "#e5e1d8" }}
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingUp className="w-4 h-4" style={{ color: "#1a7a4a" }} />
                  <h3 className="text-sm font-semibold text-gray-900">Your Giving Impact</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total donated", value: formatCurrency(totalGiven), sub: "All time" },
                    { label: "This year", value: formatCurrency(thisYearTotal), sub: currentYear },
                    { label: "Organizations", value: orgsSupported.toString(), sub: "Supported" },
                    { label: "Categories", value: categoriesCount.toString(), sub: "Causes" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl p-3"
                      style={{ backgroundColor: "#f9f8f6" }}
                    >
                      <div className="font-display text-xl font-bold text-gray-900 leading-tight">
                        {item.value}
                      </div>
                      <div className="text-xs font-medium text-gray-600 mt-0.5">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Causes */}
              <div
                className="bg-white rounded-2xl border shadow-sm p-4"
                style={{ borderColor: "#e5e1d8" }}
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Causes</h3>
                <div className="space-y-2.5">
                  {categoryBreakdown.map(({ cat, amt, pct }) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "#1a7a4a" }}
                          />
                          <span className="text-xs font-medium text-gray-700 capitalize">
                            {cat.replace("-", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-900 tabular-nums">
                            {formatCurrency(amt)}
                          </span>
                          <span className="text-xs text-gray-400">{pct}%</span>
                        </div>
                      </div>
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#f0ede6" }}
                      >
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: "#1a7a4a",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Year over Year */}
              <div
                className="bg-white rounded-2xl border shadow-sm p-4"
                style={{ borderColor: "#e5e1d8" }}
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Year Comparison</h3>
                <div className="space-y-2">
                  {[
                    { year: currentYear, total: thisYearTotal, current: true },
                    { year: lastYear, total: lastYearTotal, current: false },
                  ].map(({ year, total, current }) => {
                    const max = Math.max(thisYearTotal, lastYearTotal) || 1;
                    return (
                      <div key={year}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">{year}</span>
                          <span className="text-xs font-semibold text-gray-900 tabular-nums">
                            {formatCurrency(total)}
                          </span>
                        </div>
                        <div
                          className="w-full h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "#f0ede6" }}
                        >
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((total / max) * 100)}%`,
                              backgroundColor: current ? "#1a7a4a" : "#9ca3af",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-400 pt-1">
                    {thisYearTotal >= lastYearTotal
                      ? `Up ${formatCurrency(thisYearTotal - lastYearTotal)} vs last year`
                      : `Down ${formatCurrency(lastYearTotal - thisYearTotal)} vs last year`}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tax Documents */}
        {activeTab === "tax" && (
          <div className="space-y-6">
            <div className="rounded-2xl border p-5 flex items-start gap-4" style={{ borderColor: "#86efac", backgroundColor: "#f0fdf4" }}>
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#1a7a4a" }} />
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">All donations are tax-deductible</p>
                <p className="text-sm text-gray-600">
                  EasyToGive consolidates your giving records and generates IRS-compliant receipts.
                  Download these for your records or share with your tax preparer.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border p-5 flex items-start justify-between gap-4" style={{ borderColor: "#e5e1d8", backgroundColor: "white" }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e8f5ee" }}>
                  <span className="text-lg">✦</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">AI Tax Optimizer</p>
                  <p className="text-sm text-gray-600">
                    Find out how much your donations reduce your taxes — or how much more to give to hit a savings target.
                  </p>
                </div>
              </div>
              <a
                href="/tools/tax-optimizer"
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                Try it →
              </a>
            </div>
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
                <h2 className="font-display font-semibold text-gray-900">Annual Giving Summaries</h2>
              </div>
              {donationYears.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-500">
                  No donation records yet. Your annual summaries will appear here after your first donation.
                </div>
              ) : donationYears.map((year, i) => {
                const isCurrentYear = year === parseInt(currentYear);
                const yearRecords = allDonations.filter((d) => new Date(d.donated_at).getFullYear() === year);
                const yearTotal = yearRecords.reduce((s, r) => s + r.amount, 0);
                return (
                  <div
                    key={year}
                    className={`px-6 py-4 flex items-center justify-between ${i < donationYears.length - 1 ? "border-b" : ""}`}
                    style={{ borderColor: "#f0ede6" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e8f5ee" }}>
                        <FileText className="w-4 h-4" style={{ color: "#1a7a4a" }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {year} — Annual Giving Summary{isCurrentYear ? " (YTD)" : ""}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(yearTotal)} · {yearRecords.length} donation{yearRecords.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadYearSummaryPDF(yearRecords, year.toString(), user, profile.full_name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                      style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Receipts */}
        {activeTab === "receipts" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-gray-900">Donation Receipts</h2>
                <p className="text-sm text-gray-500 mt-0.5">Every receipt in one place — ready for tax time.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={receiptsYear === 0 ? "all" : receiptsYear}
                  onChange={(e) => setReceiptsYear(e.target.value === "all" ? 0 : parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 bg-white"
                  style={{ borderColor: "#e5e1d8" }}
                >
                  {Array.from({ length: parseInt(currentYear) - 2022 }, (_, i) => parseInt(currentYear) - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                  <option value="all">All Time</option>
                </select>
                {donationRecords.length > 0 && (
                  <button
                    onClick={() => downloadYearSummaryPDF(donationRecords, receiptsYear === 0 ? "All Time" : receiptsYear.toString(), user, profile.full_name)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download All
                  </button>
                )}
              </div>
            </div>

            {loadingReceipts ? (
              <div className="py-20 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : donationRecords.length > 0 ? (
              <>
                {/* Summary card */}
                <div
                  className="rounded-2xl p-5 border"
                  style={{ backgroundColor: "#e8f5ee", borderColor: "#1a7a4a" }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="font-display text-2xl font-bold" style={{ color: "#1a7a4a" }}>
                        ${donationRecords.reduce((s, r) => s + r.amount, 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Total donated{receiptsYear !== 0 ? ` in ${receiptsYear}` : " all time"}
                      </div>
                    </div>
                    <div>
                      <div className="font-display text-2xl font-bold text-gray-900">{donationRecords.length}</div>
                      <div className="text-xs text-gray-600 mt-0.5">Number of donations</div>
                    </div>
                    <div>
                      <div className="font-display text-2xl font-bold text-gray-900">
                        {new Set(donationRecords.map((r) => r.org_id)).size}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">Organizations supported</div>
                    </div>
                  </div>
                </div>

                {/* Receipt rows */}
                <div className="space-y-3">
                  {donationRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                      style={{ borderColor: "#e5e1d8" }}
                    >
                      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: "#1a7a4a" }}
                          >
                            {record.org_image_url ? (
                              <img src={record.org_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              record.org_name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-gray-900 truncate">{record.org_name}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(record.donated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                            </div>
                            {record.fee_covered && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5" style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                                You covered the fee
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <span className="font-bold text-sm" style={{ color: "#1a7a4a" }}>
                            ${record.amount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => setSelectedReceipt(record)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
                            style={{ borderColor: "#e5e1d8", color: "#374151" }}
                          >
                            View Receipt
                          </button>
                          {record.receipt_id && (
                            <Link
                              href={`/receipts/${record.receipt_id}`}
                              target="_blank"
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
                              style={{ borderColor: "#e5e1d8", color: "#374151" }}
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </Link>
                          )}
                          <button
                            onClick={() => downloadReceiptPDF(record, user, profile.full_name)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: "#e5e1d8" }}>
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                  No donations in {receiptsYear === 0 ? "your history" : receiptsYear}
                </h3>
                <p className="text-gray-500 mb-6 text-sm">Start giving to see your receipts here.</p>
                <Link
                  href="/discover"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  Discover Organizations
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Recurring Giving */}
        {activeTab === "recurring" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-gray-900">Recurring Giving</h2>
                <p className="text-sm text-gray-500 mt-0.5">Your active recurring donations</p>
              </div>
              <a
                href="/portfolio"
                className="text-sm font-semibold flex items-center gap-1.5"
                style={{ color: "#1a7a4a" }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Set up new
              </a>
            </div>

            {recurringDonations.length === 0 ? (
              <div
                className="rounded-2xl border p-10 text-center"
                style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
              >
                <RefreshCw className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">No active recurring gifts</p>
                <p className="text-sm text-gray-400 mb-5">
                  Set up recurring giving from any org page or your portfolio.
                </p>
                <a
                  href="/discover"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white inline-block"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  Discover organizations
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {recurringDonations.map((r) => {
                  const freqLabel = r.frequency
                    ? r.frequency.charAt(0).toUpperCase() + r.frequency.slice(1)
                    : "Recurring";
                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl border p-5 flex items-center justify-between gap-4"
                      style={{ borderColor: "#e5e1d8" }}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#e8f5ee" }}
                        >
                          <Heart className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{r.org_name}</p>
                          <p className="text-sm text-gray-500">
                            <span style={{ color: "#1a7a4a" }} className="font-semibold">
                              {formatCurrency(r.amount_cents / 100)}
                            </span>
                            {" · "}
                            {freqLabel}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {r.org_id && (
                          <a
                            href={`/org/${r.org_id}`}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => cancelRecurring(r.id)}
                          disabled={cancellingId === r.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50"
                          style={{ borderColor: "#fca5a5", color: "#dc2626", backgroundColor: "#fef2f2" }}
                        >
                          {cancellingId === r.id ? "Cancelling…" : "Cancel"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Watchlist */}
        {activeTab === "watchlist" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-gray-900">
                Saved Organizations ({watchlistOrgs.length})
              </h2>
              <Link href="/discover" className="text-sm font-medium hover:underline" style={{ color: "#1a7a4a" }}>
                Discover more →
              </Link>
            </div>
            {loadingWatchlist ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#1a7a4a" }} />
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {watchlistOrgs.map((org) => {
                    const progress = getProgressPercent(org.raised, org.goal);
                    return (
                      <div key={org.id} className="bg-white rounded-2xl border overflow-hidden card-hover" style={{ borderColor: "#e5e1d8" }}>
                        <div className="relative h-36 overflow-hidden bg-gray-100">
                          {org.image_url ? (
                            <img src={org.image_url} alt={org.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#e8f5ee" }}>
                              <Heart className="w-8 h-8" style={{ color: "#1a7a4a" }} />
                            </div>
                          )}
                          <button className="absolute top-3 right-3 p-1.5 rounded-lg" style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "white" }} aria-label="Remove from watchlist">
                            <Bookmark className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Link href={`/org/${org.id}`} className="font-display font-semibold text-gray-900 hover:text-green-700 transition-colors leading-tight">
                              {org.name}
                            </Link>
                            {org.verified && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#1a7a4a" }} />}
                          </div>
                          <p className="text-xs text-gray-500 mb-3">{org.location ?? ""}</p>
                          {org.goal > 0 && (
                            <>
                              <div className="w-full rounded-full h-1.5 mb-1.5" style={{ backgroundColor: "#e5e1d8" }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: "#1a7a4a" }} />
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                <span>{formatCurrency(org.raised)} raised</span>
                                <span>{progress}%</span>
                              </div>
                            </>
                          )}
                          <Link href={`/org/${org.id}`} className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}>
                            <Heart className="w-3.5 h-3.5" />
                            Donate
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {watchlistOrgs.length === 0 && (
                  <div className="text-center py-20">
                    <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">No saved organizations yet</h3>
                    <p className="text-gray-500 mb-6">Click the bookmark icon on any organization to save it here.</p>
                    <Link href="/discover" className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#1a7a4a" }}>
                      Discover Causes
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Admin */}
        {activeTab === "admin" && isAdmin && <AdminPanel editOrgId={editOrgParam ?? undefined} />}

        {/* Settings */}
        {activeTab === "settings" && (
          <div className="space-y-6">

            {/* Profile Information */}
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
              <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
                <User className="w-4 h-4 text-gray-500" />
                <h2 className="font-display font-semibold text-gray-900">Profile Information</h2>
              </div>
              <div className="px-6 py-5">
                {/* Avatar row — compact circle */}
                <div className="flex items-center gap-4 mb-5 pb-5 border-b" style={{ borderColor: "#f0ede6" }}>
                  <AvatarUpload
                    value={profile.avatar_url}
                    initials={initials || "??"}
                    onChange={(url) => setProfile({ ...profile, avatar_url: url })}
                  />
                </div>

                {/* 2-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location (display)</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      defaultValue={user?.email ?? ""}
                      readOnly
                      className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-400 bg-gray-50 outline-none"
                      style={{ borderColor: "#e5e1d8" }}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors resize-none"
                      style={{ borderColor: "#e5e1d8" }}
                      placeholder="Tell us a little about yourself and why you give…"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Location
                      <span className="ml-1 text-xs font-normal text-gray-400">(used to show local causes)</span>
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      <input
                        type="text"
                        value={profile.city}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                        className="col-span-3 px-3 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                        style={{ borderColor: "#e5e1d8" }}
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={profile.state}
                        onChange={(e) => setProfile({ ...profile, state: e.target.value.toUpperCase() })}
                        maxLength={2}
                        className="col-span-1 px-3 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors uppercase"
                        style={{ borderColor: "#e5e1d8" }}
                        placeholder="ST"
                      />
                      <input
                        type="text"
                        value={profile.zip}
                        onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
                        maxLength={5}
                        className="col-span-1 px-3 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                        style={{ borderColor: "#e5e1d8" }}
                        placeholder="ZIP"
                      />
                    </div>
                  </div>
                </div>

                {profileMsg && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mt-4 ${profileMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {profileMsg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    {profileMsg.text}
                  </div>
                )}

                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {profileSaving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </div>

            {/* Giving Interests (Causes) */}
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
              <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
                <Heart className="w-4 h-4 text-gray-500" />
                <h2 className="font-display font-semibold text-gray-900">Giving Interests</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-gray-500 mb-4">
                  Select the causes you care about — we&rsquo;ll personalize your discover feed and homepage.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[
                    { id: "environment", label: "Environment & Climate" },
                    { id: "education", label: "Education" },
                    { id: "health", label: "Health & Medicine" },
                    { id: "animals", label: "Animals & Wildlife" },
                    { id: "hunger", label: "Hunger Relief" },
                    { id: "housing", label: "Housing & Homelessness" },
                    { id: "civil-rights", label: "Civil Rights & Equality" },
                    { id: "children", label: "Children & Youth" },
                    { id: "veterans", label: "Veterans" },
                    { id: "arts", label: "Arts & Culture" },
                    { id: "disaster", label: "Disaster Relief" },
                    { id: "community", label: "Community" },
                  ].map(({ id, label }) => {
                    const selected = userCauses.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setUserCauses((prev) =>
                            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
                          )
                        }
                        className="px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all"
                        style={{
                          borderColor: selected ? "#1a7a4a" : "#e5e1d8",
                          backgroundColor: selected ? "#e8f5ee" : "white",
                          color: selected ? "#1a7a4a" : "#374151",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dashboard Customization + Notifications side by side on larger screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dashboard Customization */}
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
                <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
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
                              <button onClick={() => moveTab(tabId, -1)} disabled={idx === 0} className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30">
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => moveTab(tabId, 1)} disabled={idx === dashPrefs.tabOrder.length - 1} className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30">
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className={`text-sm font-medium flex-1 ${hidden ? "text-gray-400 line-through" : "text-gray-900"}`}>{tab.label}</span>
                            {isSettings ? (
                              <span className="text-xs text-gray-400 px-2">Always visible</span>
                            ) : (
                              <Toggle checked={!hidden} onChange={() => toggleHideTab(tabId)} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default tab</label>
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
                          return tab ? <option key={id} value={id}>{tab.label}</option> : null;
                        })}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
                <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
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
                      <Toggle
                        checked={notifications[item.key]}
                        onChange={(v) => setNotifications((prev) => ({ ...prev, [item.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
              <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}>
                <CreditCard className="w-4 h-4 text-gray-500" />
                <h2 className="font-display font-semibold text-gray-900">Payment Methods</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between p-3 rounded-xl border mb-4" style={{ borderColor: "#e5e1d8" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#1a56db" }}>
                      VISA
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Visa ending in 4242</div>
                      <div className="text-xs text-gray-500">Expires 08/2028</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "#e8f5ee", color: "#1a7a4a" }}>
                    Default
                  </span>
                </div>
                <button className="text-sm font-medium flex items-center gap-1.5" style={{ color: "#1a7a4a" }}>
                  + Add payment method
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedReceipt(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-y-auto"
            style={{ maxHeight: "90vh" }}
          >
            <div className="px-6 py-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="font-display text-base font-bold" style={{ color: "#1a7a4a" }}>EasyToGive</div>
                  <h2 className="font-display text-xl font-bold text-gray-900">Donation Receipt</h2>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">This serves as your official donation receipt for tax purposes.</p>

              <hr style={{ borderColor: "#e5e1d8" }} className="mb-4" />

              <div className="space-y-0.5">
                {(
                  [
                    ["Receipt Number", selectedReceipt.receipt_id ?? selectedReceipt.id.slice(0, 8).toUpperCase()],
                    ["Date", new Date(selectedReceipt.donated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
                    ["Donor Name", profile.full_name || user?.email?.split("@")[0] || "—"],
                    ["Donor Email", user?.email || "—"],
                    ["Organization", selectedReceipt.org_name],
                    ["Organization EIN", selectedReceipt.org_ein ?? "See organization directly"],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-2 border-b text-sm" style={{ borderColor: "#f0ede6" }}>
                    <span className="text-gray-500 flex-shrink-0">{label}</span>
                    <span className="text-gray-900 text-right break-all">{value}</span>
                  </div>
                ))}
                <div className="flex items-start justify-between gap-4 py-2 border-b text-sm" style={{ borderColor: "#f0ede6" }}>
                  <span className="text-gray-500 flex-shrink-0">Donation Amount</span>
                  <span className="font-semibold" style={{ color: "#1a7a4a" }}>${selectedReceipt.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-start justify-between gap-4 py-2 border-b text-sm" style={{ borderColor: "#f0ede6" }}>
                  <span className="text-gray-500 flex-shrink-0">Platform Fee</span>
                  <span className="text-gray-900 text-right">
                    ${selectedReceipt.fee_amount.toFixed(2)}{" "}
                    {selectedReceipt.fee_covered ? "(covered by you)" : "(covered by EasyToGive)"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 py-2 text-sm font-semibold">
                  <span className="text-gray-700">Total Charged</span>
                  <span style={{ color: "#1a7a4a" }}>
                    ${(selectedReceipt.amount + (selectedReceipt.fee_covered ? selectedReceipt.fee_amount : 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <hr style={{ borderColor: "#e5e1d8" }} className="my-4" />

              <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                EasyToGive is a technology platform. Please verify the tax-exempt status of the organization
                you donated to before claiming a deduction. Political donations are never tax deductible.
              </p>
              <a
                href="https://apps.irs.gov/app/eos/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold mb-5"
                style={{ color: "#1a7a4a" }}
              >
                Verify organization status on IRS.gov <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex gap-2">
                <button
                  onClick={() => downloadReceiptPDF(selectedReceipt, user, profile.full_name)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  <Download className="w-4 h-4" />
                  Download PDF Receipt
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                  style={{ borderColor: "#e5e1d8", color: "#374151" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
