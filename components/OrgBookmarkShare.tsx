"use client";

import { useState, useEffect } from "react";
import { Bookmark, Share2, Check, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

interface Props {
  orgId: string;
  orgName: string;
}

export default function OrgBookmarkShare({ orgId, orgName }: Props) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if this org is already in the user's watchlist
    async function checkWatchlist() {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .maybeSingle();
      setSaved(!!data);
    }
    checkWatchlist();
  }, [orgId]);

  async function toggleBookmark() {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect to sign in, preserving current URL
      window.location.href = `/auth/signin?redirectTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setSaving(true);
    if (saved) {
      await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("org_id", orgId);
      setSaved(false);
    } else {
      await supabase
        .from("watchlist")
        .insert({ user_id: user.id, org_id: orgId });
      setSaved(true);
    }
    setSaving(false);
  }

  async function handleShare() {
    const url = window.location.href;
    const shareData = {
      title: `${orgName} — EasyToGive`,
      text: `Support ${orgName} on EasyToGive`,
      url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // last resort — prompt
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={toggleBookmark}
        disabled={saving}
        className="p-2.5 rounded-lg text-white transition-colors hover:bg-white/20 disabled:opacity-60"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        aria-label={saved ? "Remove from saved" : "Save to watchlist"}
        title={saved ? "Remove from saved" : "Save to watchlist"}
      >
        <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
      </button>

      <button
        onClick={handleShare}
        className="p-2.5 rounded-lg text-white transition-colors hover:bg-white/20 relative"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        aria-label="Share"
        title={copied ? "Link copied!" : "Share"}
      >
        {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        {copied && (
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Copied!
          </span>
        )}
      </button>
    </div>
  );
}
