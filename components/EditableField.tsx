"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useEditMode } from "@/components/EditModeContext";
import { Check, X } from "lucide-react";

interface Props {
  /** ID of the org to update in organizations table */
  orgId?: string;
  /** Column name in organizations table (e.g. "name", "tagline") */
  field?: string;
  /** Key in site_settings table for homepage/global content */
  settingKey?: string;
  /** Current value */
  value: string;
  /** HTML tag to render as (default: "span") */
  as?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Render a <textarea> instead of <input> */
  multiline?: boolean;
}

export default function EditableField({
  orgId,
  field,
  settingKey,
  value,
  as: Tag = "span",
  className = "",
  style,
  multiline = false,
}: Props) {
  const { editMode } = useEditMode();
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient() as any;
      if (orgId && field) {
        await supabase
          .from("organizations")
          .update({ [field]: draft })
          .eq("id", orgId);
      } else if (settingKey) {
        await supabase
          .from("site_settings")
          .upsert({ key: settingKey, value: draft });
      }
      setCurrent(draft);
    } catch {
      // silently fail
    }
    setEditing(false);
    setSaving(false);
  }

  function cancel() {
    setDraft(current);
    setEditing(false);
  }

  function startEdit() {
    setDraft(current);
    setEditing(true);
  }

  // Not in edit mode — render normally
  if (!editMode) {
    return React.createElement(Tag, { className, style }, current);
  }

  // In edit mode, actively editing this field
  if (editing) {
    return (
      <span className="inline-flex flex-col gap-1.5 w-full align-top">
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            autoFocus
            className={`w-full px-3 py-2 rounded-lg text-sm leading-relaxed resize-y ${className}`}
            style={{
              border: "2px solid #3b82f6",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className={`px-3 py-1.5 rounded-lg text-sm w-full ${className}`}
            style={{
              border: "2px solid #3b82f6",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        )}
        <span className="flex items-center gap-1.5">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            <Check className="w-3 h-3" />
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={cancel}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </span>
      </span>
    );
  }

  // In edit mode, hoverable/clickable
  return React.createElement(
    Tag,
    {
      className: `${className} cursor-pointer transition-all`,
      style: {
        ...style,
        ...(hovered
          ? {
              outline: "2px solid #3b82f6",
              outlineOffset: "3px",
              borderRadius: "4px",
            }
          : {}),
      },
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onClick: startEdit,
      title: "Click to edit",
    },
    current
  );
}
