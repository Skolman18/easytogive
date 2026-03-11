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


const CATEGORY_LABELS: Record<string, string> = {
  churches: "Church",
  "animal-rescue": "Animal Rescue",
  nonprofits: "Nonprofit",
  education: "Education",
  environment: "Environment",
  local: "Local Cause",
};

// Which DB column each page uses for ordering
const PAGE_CONFIGS = {
  home: {
    label: "Home Page",
    orderField: "home_sort_order",
    description: "Controls the order organizations appear in the Browse section on the home page.",
  },
  discover: {
    label: "Discover Page",
    orderField: "sort_order",
    description: "Controls the order organizations appear on the Discover page.",
  },
} as const;

type PageKey = keyof typeof PAGE_CONFIGS;

function SortableRow({
  org,
  onToggle,
}: {
  org: any;
  onToggle: (id: string, field: string, val: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: org.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

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
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{org.name}</p>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          {catLabel}
        </span>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {"visible" in org && (
          <label className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Visible</span>
            <Toggle
              checked={(org as any).visible ?? true}
              onChange={(v) => onToggle(org.id, "visible", v)}
            />
          </label>
        )}
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

function OrderingList({ pageKey }: { pageKey: PageKey }) {
  const config = PAGE_CONFIGS[pageKey];
  const [orgs, setOrgs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadOrgs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  async function loadOrgs() {
    const { data } = await (createClient() as any)
      .from("organizations")
      .select(`id, name, category, image_url, featured, verified, visible, sort_order, home_sort_order`)
      .order(config.orderField, { ascending: true })
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

    setSaving(true);
    const supabase = createClient() as any;
    await Promise.all(
      reordered.map((org, i) =>
        supabase
          .from("organizations")
          .update({ [config.orderField]: i })
          .eq("id", org.id)
      )
    );
    setSaving(false);
    setMessage("Order saved");
    setTimeout(() => setMessage(""), 2000);
  }

  async function handleToggle(id: string, field: string, val: boolean) {
    setOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: val } : o)));
    await (createClient() as any)
      .from("organizations")
      .update({ [field]: val })
      .eq("id", id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {config.label} — Ordering &amp; Visibility
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
        </div>
        <div className="text-sm">
          {saving && <span className="text-gray-400">Saving…</span>}
          {!saving && message && <span className="text-green-600">{message}</span>}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">Drag rows to reorder. Toggles save instantly.</p>

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

export default function OrgOrderingTab() {
  const [page, setPage] = useState<PageKey>("home");

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-0 border-b mb-6" style={{ borderColor: "#e5e7eb" }}>
        {(Object.keys(PAGE_CONFIGS) as PageKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              page === key
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={page === key ? { borderColor: "#1a7a4a", color: "#1a7a4a" } : {}}
          >
            {PAGE_CONFIGS[key].label}
          </button>
        ))}
      </div>

      <OrderingList key={page} pageKey={page} />
    </div>
  );
}
