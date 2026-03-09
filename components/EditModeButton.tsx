"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useEditMode } from "@/components/EditModeContext";

const ADMIN_EMAIL = "sethmitzel@gmail.com";

export default function EditModeButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { editMode, setEditMode } = useEditMode();

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user?.email === ADMIN_EMAIL) setIsAdmin(true);
      });
  }, []);

  if (!isAdmin) return null;

  return (
    <button
      onClick={() => setEditMode(!editMode)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
      style={{
        backgroundColor: editMode ? "#1a7a4a" : "#0d1117",
        color: "white",
        boxShadow: editMode
          ? "0 0 0 3px #86efac, 0 4px 20px rgba(26,122,74,0.4)"
          : "0 4px 20px rgba(0,0,0,0.35)",
      }}
    >
      {editMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
      {editMode ? "Exit Edit Mode" : "Edit Mode"}
    </button>
  );
}
