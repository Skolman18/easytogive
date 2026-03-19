"use client";
import dynamic from "next/dynamic";

// Embed the existing full org management panel as-is
const AdminPanel = dynamic(() => import("@/components/AdminPanel"), { ssr: false });

export default function OrgsTab() {
  return (
    <div>
      <AdminPanel />
    </div>
  );
}
