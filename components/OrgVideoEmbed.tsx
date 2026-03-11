"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VideoOff, GripHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useEditMode } from "@/components/EditModeContext";

const ADMIN_EMAIL = "sethmitzel@gmail.com";
const MIN_SIZE = 30;
const MAX_SIZE = 100;

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/v\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function VideoErrorState() {
  return (
    <div
      className="w-full aspect-video rounded-xl flex flex-col items-center justify-center gap-2"
      style={{ backgroundColor: "#f3f4f6" }}
    >
      <VideoOff className="w-8 h-8" style={{ color: "#9ca3af" }} />
      <p className="text-sm text-gray-500 font-medium">Video unavailable</p>
      <p className="text-xs" style={{ color: "#9ca3af" }}>
        Check that the video URL is correct and the video is set to public.
      </p>
    </div>
  );
}

function EmbedWithState({ src, allow, title }: { src: string; allow: string; title: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className="relative w-full">
      {status === "loading" && (
        <div className="w-full aspect-video rounded-xl animate-pulse bg-gray-200" />
      )}
      {status === "error" ? (
        <VideoErrorState />
      ) : (
        <iframe
          src={src}
          title={title}
          allow={allow}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className="w-full rounded-xl aspect-video"
          style={{
            border: "none",
            minHeight: 240,
            display: status === "loading" ? "none" : "block",
          }}
        />
      )}
    </div>
  );
}

export default function OrgVideoEmbed({
  orgId,
  videoUrl,
  videoType,
  coverUrl,
  initialSize = 100,
}: {
  orgId: string;
  videoUrl: string;
  videoType: string;
  coverUrl: string;
  initialSize?: number;
}) {
  const [size, setSize] = useState(Math.max(MIN_SIZE, Math.min(MAX_SIZE, initialSize)));
  const [isAdmin, setIsAdmin] = useState(false);
  const { viewMode } = useEditMode();
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startSize: number } | null>(null);

  useEffect(() => {
    (createClient() as any).auth.getUser().then(({ data: { user } }: any) => {
      if (user?.email === ADMIN_EMAIL) setIsAdmin(true);
    });
  }, []);

  const saveSize = useCallback(async (pct: number) => {
    await (createClient() as any)
      .from("organizations")
      .update({ video_size_percent: Math.round(pct) })
      .eq("id", orgId);
  }, [orgId]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const containerWidth = cardRef.current?.offsetWidth ?? 600;
    dragState.current = { startX: e.clientX, startSize: size };
    setIsDragging(true);

    function onMouseMove(ev: MouseEvent) {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const delta = (dx / containerWidth) * 100;
      const next = Math.max(MIN_SIZE, Math.min(MAX_SIZE, dragState.current.startSize + delta));
      setSize(next);
    }

    function onMouseUp(ev: MouseEvent) {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const containerWidth = cardRef.current?.offsetWidth ?? 600;
      const delta = (dx / containerWidth) * 100;
      const final = Math.max(MIN_SIZE, Math.min(MAX_SIZE, dragState.current.startSize + delta));
      setSize(final);
      saveSize(final);
      dragState.current = null;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [size, saveSize]);

  // Touch support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const containerWidth = cardRef.current?.offsetWidth ?? 600;
    dragState.current = { startX: touch.clientX, startSize: size };
    setIsDragging(true);

    function onTouchMove(ev: TouchEvent) {
      if (!dragState.current) return;
      const dx = ev.touches[0].clientX - dragState.current.startX;
      const delta = (dx / containerWidth) * 100;
      const next = Math.max(MIN_SIZE, Math.min(MAX_SIZE, dragState.current.startSize + delta));
      setSize(next);
    }

    function onTouchEnd(ev: TouchEvent) {
      if (!dragState.current) return;
      const dx = (ev.changedTouches[0]?.clientX ?? dragState.current.startX) - dragState.current.startX;
      const delta = (dx / containerWidth) * 100;
      const final = Math.max(MIN_SIZE, Math.min(MAX_SIZE, dragState.current.startSize + delta));
      setSize(final);
      saveSize(final);
      dragState.current = null;
      setIsDragging(false);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    }

    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
  }, [size, saveSize]);

  let content: React.ReactNode = null;

  if (videoType === "youtube") {
    const vid = extractYouTubeId(videoUrl);
    if (vid) {
      content = (
        <EmbedWithState
          src={`https://www.youtube-nocookie.com/embed/${vid}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          title="Organization video"
        />
      );
    }
  } else if (videoType === "vimeo") {
    const vid = extractVimeoId(videoUrl);
    if (vid) {
      content = (
        <EmbedWithState
          src={`https://player.vimeo.com/video/${vid}?badge=0&autopause=0&player_id=0`}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
          title="Organization video"
        />
      );
    }
  } else if (videoType === "upload") {
    content = (
      <video
        controls
        className="w-full rounded-xl"
        style={{ maxHeight: 480 }}
        poster={coverUrl || undefined}
      >
        <source src={videoUrl} />
      </video>
    );
  }

  if (!content) return null;

  return (
    <div
      ref={cardRef}
      className="rounded-xl border bg-white p-4 shadow-sm relative"
      style={{ borderColor: "#e5e1d8" }}
    >
      <p className="font-medium text-gray-400 mb-3" style={{ fontSize: 13 }}>
        Watch
      </p>

      {/* Resize handle — top-right corner, admin only */}
      {isAdmin && viewMode === "admin" && (
        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          title={`Video width: ${Math.round(size)}% — drag to resize`}
          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg select-none transition-colors z-10"
          style={{
            cursor: isDragging ? "ew-resize" : "ew-resize",
            backgroundColor: isDragging ? "rgba(26,122,74,0.12)" : "rgba(0,0,0,0.04)",
            border: isDragging ? "1px solid rgba(26,122,74,0.3)" : "1px solid transparent",
            userSelect: "none",
          }}
        >
          <GripHorizontal className="w-3.5 h-3.5" style={{ color: isDragging ? "#1a7a4a" : "#9ca3af" }} />
          <span className="text-xs font-mono" style={{ color: isDragging ? "#1a7a4a" : "#9ca3af" }}>
            {Math.round(size)}%
          </span>
        </div>
      )}

      {/* Video at current size, centered */}
      <div
        className="mx-auto transition-none"
        style={{ width: `${size}%` }}
      >
        {content}
      </div>
    </div>
  );
}
