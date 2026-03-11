"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useEditMode, type ViewMode } from "@/components/EditModeContext";
import { Building2, User, ShieldCheck } from "lucide-react";

const ADMIN_EMAIL = "sethmitzel@gmail.com";

const MODES: { id: ViewMode; label: string; Icon: React.ElementType; desc: string }[] = [
  { id: "admin",  label: "Admin",        Icon: ShieldCheck, desc: "Full admin chrome" },
  { id: "org",    label: "Organization", Icon: Building2,   desc: "Org manager view" },
  { id: "giver",  label: "Giver",        Icon: User,        desc: "Public donor view" },
];

export default function AdminViewSwitcher() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { viewMode, setViewMode } = useEditMode();

  useEffect(() => {
    (createClient() as any).auth.getUser().then(({ data: { user } }: any) => {
      if (user?.email === ADMIN_EMAIL) setIsAdmin(true);
    });
  }, []);

  if (!isAdmin) return null;

  return (
    <div
      className="fixed bottom-5 left-1/2 z-50 flex items-center gap-1 rounded-full px-2 py-1.5 shadow-xl"
      style={{
        transform: "translateX(-50%)",
        backgroundColor: "#0d1117",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 px-2 select-none">
        Preview
      </span>
      {MODES.map(({ id, label, Icon }) => {
        const active = viewMode === id;
        return (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            title={MODES.find(m => m.id === id)?.desc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              active
                ? { backgroundColor: "#1a7a4a", color: "white" }
                : { color: "#9ca3af", backgroundColor: "transparent" }
            }
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
