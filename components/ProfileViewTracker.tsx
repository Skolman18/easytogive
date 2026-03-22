"use client";

import { useEffect } from "react";

export default function ProfileViewTracker({ orgId }: { orgId: string }) {
  useEffect(() => {
    fetch(`/api/org/${orgId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "profile_view" }),
    }).catch(() => {});
  }, [orgId]);
  return null;
}
