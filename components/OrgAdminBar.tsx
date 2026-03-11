"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useEditMode } from "@/components/EditModeContext";

const ADMIN_EMAIL = "sethmitzel@gmail.com";

interface Props {
  orgId: string;
  orgName: string;
}

export default function OrgAdminBar({ orgId, orgName }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { viewMode } = useEditMode();

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) setIsAdmin(true);
    });
  }, []);

  if (!isAdmin || dismissed || viewMode !== "admin") return null;

  return (
    <div
      className="sticky top-14 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 text-sm font-medium"
      style={{ backgroundColor: "#0d2b1a", color: "#4ade80", borderBottom: "1px solid #1a3d28" }}
    >
      <div className="flex items-center gap-2">
        <Pencil className="w-3.5 h-3.5" />
        <span className="text-white/60">Admin view:</span>
        <span className="font-semibold text-white">{orgName}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/profile?tab=admin&editOrg=${orgId}`}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors hover:opacity-80"
          style={{ backgroundColor: "#1a7a4a", color: "white" }}
        >
          <Pencil className="w-3 h-3" />
          Edit in Admin
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
