"use client";

// Make sure the "images" bucket exists in Supabase Dashboard → Storage and is set to Public

import { useRef, useState } from "react";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  /** Aspect class applied to preview container, e.g. "aspect-video" or "aspect-square" */
  aspect?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  hint,
  aspect = "aspect-video",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");

    if (!ACCEPTED.includes(file.type)) {
      setError("Only JPG, PNG, or WebP files are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large — maximum size is 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient() as any;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("images").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed. Check that the images bucket exists and is public.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </label>
      )}
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}

      {/* Preview / drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed overflow-hidden ${aspect} flex items-center justify-center cursor-pointer transition-colors hover:border-green-400 hover:bg-green-50/30`}
        style={{ borderColor: error ? "#f87171" : "#e5e7eb", backgroundColor: "#f9fafb" }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
            />
            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#1a7a4a" }} />
            <span className="text-xs">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e8f5ee" }}>
              <Upload className="w-5 h-5" style={{ color: "#1a7a4a" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Click or drag to upload</p>
              <p className="text-xs text-gray-400">JPG, PNG, WebP · max 5 MB</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {/* Manual URL fallback */}
      <div className="mt-2 flex items-center gap-2">
        <ImageIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input
          type="url"
          placeholder="Or paste an image URL…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 border rounded-lg text-xs text-gray-700 outline-none focus:border-green-600 transition-colors bg-white"
          style={{ borderColor: "#e5e7eb" }}
        />
      </div>
    </div>
  );
}
