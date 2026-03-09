"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import Toggle from "@/components/Toggle";

const CATEGORY_COLORS: Record<string, string> = {
  churches: "#7c3aed",
  "animal-rescue": "#f59e0b",
  nonprofits: "#3b82f6",
  education: "#6366f1",
  environment: "#10b981",
  local: "#f97316",
};

const CATEGORY_LABELS: Record<string, string> = {
  churches: "Church",
  "animal-rescue": "Animal Rescue",
  nonprofits: "Nonprofit",
  education: "Education",
  environment: "Environment",
  local: "Local Cause",
};

function SortableRow({ org, onToggle }: { org: any; onToggle: (id: string, field: string, val: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: org.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const catColor = CATEGORY_COLORS[org.category] || "#6b7280";
  const catLabel = CATEGORY_LABELS[org.category] || org.category;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 bg-white border rounded-xl mb-2"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Thumbnail */}
      <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
        {org.image_url ? (
          <img src={org.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: catColor + "20" }} />
        )}
      </div>

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{org.name}</p>
        <span
          className="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: catColor }}
        >
          {catLabel}
        </span>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <label className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Visible</span>
          <Toggle
            checked={org.visible ?? true}
            onChange={(v) => onToggle(org.id, "visible", v)}
          />
        </label>
        <label className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Featured</span>
          <Toggle
            checked={org.featured ?? false}
            onChange={(v) => onToggle(org.id, "featured", v)}
          />
        </label>
        <label className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Verified</span>
          <Toggle
            checked={org.verified ?? false}
            onChange={(v) => onToggle(org.id, "verified", v)}
          />
        </label>
      </div>
    </div>
  );
}

export default function OrgOrderingTab() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    const { data } = await (createClient() as any)
      .from("organizations")
      .select("id, name, category, image_url, visible, featured, verified, sort_order")
      .order("sort_order", { ascending: true })
      .order("name");
    if (data) setOrgs(data);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = orgs.findIndex((o) => o.id === active.id);
    const newIdx = orgs.findIndex((o) => o.id === over.id);
    const reordered = arrayMove(orgs, oldIdx, newIdx);
    setOrgs(reordered);

    // Save sort_order for all reordered items
    setSaving(true);
    const supabase = createClient() as any;
    await Promise.all(
      reordered.map((org, i) =>
        supabase.from("organizations").update({ sort_order: i }).eq("id", org.id)
      )
    );
    setSaving(false);
    setMessage("Order saved");
    setTimeout(() => setMessage(""), 2000);
  }

  async function handleToggle(id: string, field: string, val: boolean) {
    setOrgs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: val } : o))
    );
    await (createClient() as any)
      .from("organizations")
      .update({ [field]: val })
      .eq("id", id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Ordering & Visibility</h2>
          <p className="text-sm text-gray-500 mt-0.5">Drag rows to reorder. Toggles save instantly.</p>
        </div>
        {saving && <p className="text-sm text-gray-400">Saving…</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orgs.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {orgs.map((org) => (
            <SortableRow key={org.id} org={org} onToggle={handleToggle} />
          ))}
        </SortableContext>
      </DndContext>

      {orgs.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No organizations found.</div>
      )}
    </div>
  );
}
