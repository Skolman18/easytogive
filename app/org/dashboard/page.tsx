"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Building2,
  DollarSign,
  ArrowLeft,
  Pencil,
  Save,
  X,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { PreviewBanner, AdminNotesPanel } from "@/components/AdminPreviewOverlay";

interface OrgData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  our_story: string;
  website: string;
  image_url: string;
  cover_url: string;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  visible: boolean;
}

function OrgDashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stripeResult = searchParams.get("stripe");
  const orgIdParam = searchParams.get("orgId");
  const isPreview = searchParams.get("preview") === "true";

  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgData | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Edit profile state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", tagline: "", description: "", our_story: "", website: "", image_url: "", cover_url: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const ADMIN_EMAIL = "sethmitzel@gmail.com";

  useEffect(() => {
    async function load() {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/signin?redirectTo=/org/dashboard");
        return;
      }

      setUserEmail(user.email ?? null);
      const isAdmin = user.email === ADMIN_EMAIL;

      // Admin sees all orgs; org reps see their own (matched by contact_email or owner_user_id).
      // Do NOT filter by visible here — org reps need to access their org even before it goes public.
      let query = supabase
        .from("organizations")
        .select("id, name, tagline, description, our_story, website, image_url, cover_url, stripe_account_id, stripe_onboarding_complete, visible");

      if (!isAdmin) {
        query = query.or(
          `contact_email.eq.${user.email},owner_user_id.eq.${user.id}`
        );
      }

      const { data } = await query.order("name");
      const orgList: OrgData[] = (data ?? []).map((o: any) => ({
        id: o.id,
        name: o.name,
        tagline: o.tagline ?? "",
        description: o.description ?? "",
        our_story: o.our_story ?? "",
        website: o.website ?? "",
        image_url: o.image_url ?? "",
        cover_url: o.cover_url ?? "",
        stripe_account_id: o.stripe_account_id ?? null,
        stripe_onboarding_complete: o.stripe_onboarding_complete ?? false,
        visible: o.visible ?? false,
      }));

      setOrgs(orgList);

      // Auto-select if orgId param or only one org
      const target = orgIdParam
        ? orgList.find((o) => o.id === orgIdParam) ?? orgList[0] ?? null
        : orgList.length === 1
        ? orgList[0]
        : null;
      setSelectedOrg(target);
      setLoading(false);
    }

    load();
  }, [router, orgIdParam]);

  // After Stripe redirect, verify account status
  useEffect(() => {
    if (stripeResult === "success" && selectedOrg?.stripe_account_id) {
      verifyAccountStatus(selectedOrg.stripe_account_id);
    }
  }, [stripeResult, selectedOrg?.stripe_account_id]); // eslint-disable-line

  async function verifyAccountStatus(accountId: string) {
    setVerifying(true);
    try {
      const res = await fetch(`/api/stripe/connect/account-status?accountId=${encodeURIComponent(accountId)}`);
      const data = await res.json();
      if (data.isComplete) {
        setSelectedOrg((prev) => prev ? { ...prev, stripe_onboarding_complete: true } : prev);
        setOrgs((prev) =>
          prev.map((o) =>
            o.stripe_account_id === accountId ? { ...o, stripe_onboarding_complete: true } : o
          )
        );
      }
    } catch { /* silent */ }
    setVerifying(false);
  }

  async function handleConnectStripe() {
    if (!selectedOrg) return;
    setConnectLoading(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: selectedOrg.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect. Please try again.";
      setConnectError(msg);
      setConnectLoading(false);
    }
  }

  async function handleRetryOnboarding() {
    if (!selectedOrg?.stripe_account_id) {
      handleConnectStripe();
      return;
    }
    setConnectLoading(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: selectedOrg.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed. Please try again.";
      setConnectError(msg);
      setConnectLoading(false);
    }
  }

  async function uploadImage(file: File, type: "logo" | "cover") {
    if (!org) return;
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    setEditError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("orgId", org.id);
      fd.append("type", type);
      const res = await fetch("/api/org/upload-image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      const field = type === "logo" ? "image_url" : "cover_url";
      setEditForm((f) => ({ ...f, [field]: json.url }));
      // Also update the live org data so the preview reflects it
      setSelectedOrg((prev) => prev ? { ...prev, [field]: json.url } : prev);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Upload failed.");
    }
    setUploading(false);
  }

  function openEdit() {
    if (!org) return;
    setEditForm({
      name: org.name,
      tagline: org.tagline,
      description: org.description,
      our_story: org.our_story,
      website: org.website,
      image_url: org.image_url,
      cover_url: org.cover_url,
    });
    setEditError(null);
    setEditSuccess(false);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!org) return;
    setEditSaving(true);
    setEditError(null);
    setEditSuccess(false);
    try {
      const res = await fetch("/api/org/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: org.id, updates: editForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      // Update local state
      const updated = json.organization;
      setSelectedOrg((prev) => prev ? { ...prev, ...updated, stripe_account_id: prev.stripe_account_id, stripe_onboarding_complete: prev.stripe_onboarding_complete } : prev);
      setOrgs((prev) => prev.map((o) => o.id === org.id ? { ...o, ...updated, stripe_account_id: o.stripe_account_id, stripe_onboarding_complete: o.stripe_onboarding_complete } : o));
      setEditSuccess(true);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save.");
    }
    setEditSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#faf9f6" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#faf9f6" }}>
        <div className="text-center max-w-sm">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-gray-900 mb-2">No organization found</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your account ({userEmail}) is not linked to any organization on EasyToGive.
            Contact us if you believe this is an error.
          </p>
          <Link
            href="mailto:seth@easytogive.online"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  const org = selectedOrg ?? orgs[0];
  const isConnected = org?.stripe_onboarding_complete ?? false;

  const previewLabel = org ? `Viewing as ${org.name}` : undefined;

  return (
    <>
    {isPreview && <PreviewBanner label={previewLabel} />}
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: "#e5e1d8" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/profile" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Organization Dashboard
            </p>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">{org?.name}</h1>
              {org && (
                <Link
                  href={`/org/${org.id}`}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mt-0.5"
                >
                  View public page <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Org selector (admin only) */}
            {orgs.length > 1 && (
              <select
                value={org?.id ?? ""}
                onChange={(e) => {
                  const found = orgs.find((o) => o.id === e.target.value) ?? null;
                  setSelectedOrg(found);
                  setConnectError(null);
                }}
                className="px-3 py-2 border rounded-lg text-sm text-gray-900 outline-none bg-white"
                style={{ borderColor: "#e5e1d8" }}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Profile visibility notice */}
        {org && !org.visible && userEmail !== ADMIN_EMAIL && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Your profile is not yet public</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Complete your profile below and contact us to make your page visible to donors.
              </p>
            </div>
          </div>
        )}

        {/* Stripe return banners */}
        {stripeResult === "success" && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "#e8f5ee", border: "1px solid #86efac" }}
          >
            {verifying ? (
              <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" style={{ color: "#1a7a4a" }} />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#1a7a4a" }} />
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {verifying ? "Verifying your Stripe account…" : "Stripe setup received!"}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {isConnected
                  ? "Your bank account is connected. Donations will be transferred automatically."
                  : "We're confirming your account status. Refresh in a moment if it doesn't update."}
              </p>
            </div>
          </div>
        )}

        {stripeResult === "refresh" && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Setup link expired</p>
              <p className="text-xs text-gray-600 mt-0.5">
                The Stripe onboarding link expired. Click the button below to get a new link.
              </p>
            </div>
          </div>
        )}

        {/* Stripe Connect card */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
          <div
            className="px-6 py-4 border-b flex items-center gap-2"
            style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
          >
            <DollarSign className="w-4 h-4 text-gray-500" />
            <h2 className="font-display font-semibold text-gray-900">Bank Account &amp; Payouts</h2>
          </div>

          <div className="px-6 py-5">
            {isConnected ? (
              /* Connected state */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#e8f5ee" }}
                  >
                    <CheckCircle className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Bank Account Connected</p>
                    <p className="text-xs text-gray-500">
                      Donations are automatically transferred to your account via Stripe.
                      A 1% platform fee is retained by EasyToGive.
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-lg p-3 text-xs text-gray-600 space-y-1"
                  style={{ backgroundColor: "#f9f8f6", border: "1px solid #e5e1d8" }}
                >
                  <p>• Payouts are typically sent within 2–7 business days of each donation.</p>
                  <p>• EasyToGive retains a 1% platform fee per transaction.</p>
                  <p>• Donors can optionally cover the fee so 100% reaches you.</p>
                </div>

                <button
                  onClick={handleRetryOnboarding}
                  disabled={connectLoading || isPreview}
                  className="flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: "#1a7a4a" }}
                  title={isPreview ? "Disabled in preview mode" : undefined}
                >
                  {connectLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Update bank details in Stripe
                  {isPreview && <span className="ml-1 text-xs text-yellow-700">(preview)</span>}
                </button>
              </div>
            ) : (
              /* Not connected state */
              <div className="space-y-4">
                <div
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Connect your bank account to receive donations
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Donors can already find and give to your organization, but payouts
                      are on hold until you connect a bank account through Stripe.
                      The process takes about 5 minutes.
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-lg p-3 text-xs text-gray-600 space-y-1"
                  style={{ backgroundColor: "#f9f8f6", border: "1px solid #e5e1d8" }}
                >
                  <p className="font-semibold text-gray-700 mb-1">What you&apos;ll need:</p>
                  <p>• Business name and EIN (or SSN for unincorporated orgs)</p>
                  <p>• Bank account details for payouts</p>
                  <p>• A representative who can verify their identity</p>
                </div>

                {connectError && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-lg text-sm"
                    style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {connectError}
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectLoading || isPreview}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#1a7a4a" }}
                    title={isPreview ? "Disabled in preview mode" : undefined}
                  >
                    {connectLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    {connectLoading ? "Redirecting to Stripe…" : "Connect Bank Account"}
                  </button>
                  {isPreview && (
                    <span className="text-xs text-yellow-700 font-medium bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-lg">
                      Disabled in preview mode
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  You&apos;ll be redirected to Stripe to complete identity verification and bank setup.
                  Your information is handled securely by Stripe — EasyToGive does not store bank details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href={`/org/${org?.id}`}
            className="bg-white rounded-2xl border p-5 flex items-center gap-3 hover:border-green-600 transition-colors"
            style={{ borderColor: "#e5e1d8" }}
          >
            <Building2 className="w-5 h-5 flex-shrink-0 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Public Profile</p>
              <p className="text-xs text-gray-500">View how donors see your page</p>
            </div>
          </Link>
          {userEmail === ADMIN_EMAIL ? (
            <Link
              href="/profile?tab=admin"
              className="bg-white rounded-2xl border p-5 flex items-center gap-3 hover:border-green-600 transition-colors"
              style={{ borderColor: "#e5e1d8" }}
            >
              <DollarSign className="w-5 h-5 flex-shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Admin Panel</p>
                <p className="text-xs text-gray-500">Full org management &amp; applications</p>
              </div>
            </Link>
          ) : (
            <button
              onClick={openEdit}
              className="bg-white rounded-2xl border p-5 flex items-center gap-3 hover:border-green-600 transition-colors text-left w-full"
              style={{ borderColor: "#e5e1d8" }}
            >
              <Pencil className="w-5 h-5 flex-shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Edit Profile</p>
                <p className="text-xs text-gray-500">Update name, description, and links</p>
              </div>
            </button>
          )}
        </div>

        {/* Inline edit form for org reps */}
        {editOpen && (
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e1d8" }}>
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "#f0ede6", backgroundColor: "#faf9f6" }}
            >
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-gray-500" />
                <h2 className="font-display font-semibold text-gray-900">Edit Organization Profile</h2>
              </div>
              <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { key: "name", label: "Organization Name" },
                { key: "tagline", label: "Tagline" },
                { key: "website", label: "Website URL" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="text"
                    value={editForm[key as keyof typeof editForm]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-600"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                </div>
              ))}

              {/* Logo upload */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Logo / Profile Image</label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border"
                    style={{ borderColor: "#e5e1d8", backgroundColor: "#f0ede6" }}
                  >
                    {editForm.image_url ? (
                      <img src={editForm.image_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
                      style={{ borderColor: "#e5e1d8", color: "#374151" }}>
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingLogo ? "Uploading…" : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={uploadingLogo}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadImage(f, "logo");
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP or GIF · max 5 MB</p>
                  </div>
                </div>
              </div>

              {/* Cover photo upload */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cover Photo</label>
                <div
                  className="w-full h-28 rounded-xl overflow-hidden border flex items-center justify-center mb-2"
                  style={{ borderColor: "#e5e1d8", backgroundColor: "#f0ede6" }}
                >
                  {editForm.cover_url ? (
                    <img src={editForm.cover_url} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
                  style={{ borderColor: "#e5e1d8", color: "#374151" }}>
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingCover ? "Uploading…" : "Upload Cover Photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploadingCover}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "cover");
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">Recommended: 1200 × 400 px · max 5 MB</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-600 resize-none"
                  style={{ borderColor: "#e5e1d8" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Our Story</label>
                <textarea
                  rows={4}
                  value={editForm.our_story}
                  onChange={(e) => setEditForm((f) => ({ ...f, our_story: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-600 resize-none"
                  style={{ borderColor: "#e5e1d8" }}
                />
              </div>

              {editError && (
                <div className="flex items-start gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "#e8f5ee", border: "1px solid #86efac", color: "#166534" }}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Changes saved!
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {isPreview && <AdminNotesPanel />}
    </>
  );
}

export default function OrgDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#faf9f6" }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a7a4a" }} />
        </div>
      }
    >
      <OrgDashboardInner />
    </Suspense>
  );
}
