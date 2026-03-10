"use client";

import { useState, useEffect } from "react";
import { Lock, Heart, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

// ─── Mock card for the blurred app preview ───────────────────────────────────

function MockCard({ rotate, opacity }: { rotate: number; opacity: number }) {
  return (
    <div
      style={{
        width: 180,
        borderRadius: 16,
        overflow: "hidden",
        transform: `rotate(${rotate}deg)`,
        opacity,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}
    >
      {/* Image area */}
      <div
        style={{
          height: 110,
          background:
            "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
        }}
      >
        {/* Category badge shape */}
        <div style={{ padding: "10px 10px 0" }}>
          <div
            style={{
              display: "inline-block",
              height: 16,
              width: 60,
              borderRadius: 20,
              background: "rgba(255,255,255,0.25)",
            }}
          />
        </div>
      </div>
      {/* Content area */}
      <div style={{ padding: 14, background: "rgba(0,0,0,0.12)" }}>
        {/* Title */}
        <div
          style={{
            height: 12,
            borderRadius: 4,
            background: "rgba(255,255,255,0.45)",
            marginBottom: 8,
            width: "78%",
          }}
        />
        {/* Location line */}
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: "rgba(255,255,255,0.25)",
            marginBottom: 10,
            width: "52%",
          }}
        />
        {/* Body lines */}
        <div
          style={{
            height: 6,
            borderRadius: 4,
            background: "rgba(255,255,255,0.15)",
            marginBottom: 5,
          }}
        />
        <div
          style={{
            height: 6,
            borderRadius: 4,
            background: "rgba(255,255,255,0.12)",
            width: "88%",
          }}
        />
        {/* Progress bar */}
        <div
          style={{
            marginTop: 14,
            height: 4,
            borderRadius: 4,
            background: "rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "62%",
              borderRadius: 4,
              background: "rgba(255,255,255,0.35)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "duplicate" | "invalid" | "error"
  >("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger fade-in after mount
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    const supabase = createClient() as any;
    const { error } = await supabase.from("waitlist").insert({ email: trimmed });
    if (!error) {
      setStatus("success");
    } else if (error.code === "23505") {
      setStatus("duplicate");
    } else {
      setStatus("error");
    }
  }

  const noiseUrl = `url("data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/></filter><rect width="200" height="200" filter="url(#n)" opacity="0.035"/></svg>'
  )}")`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0d4a2a 0%, #1a7a4a 50%, #0d4a2a 100%)",
        backgroundRepeat: "repeat",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Noise texture overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: noiseUrl,
          backgroundRepeat: "repeat",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Main content — fade in on mount */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        {/* ── TOP BAR ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center pt-10 pb-2 px-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <Heart className="w-4.5 h-4.5 text-white fill-white" style={{ width: 18, height: 18 }} />
            </div>
            <span
              className="font-display text-2xl font-semibold tracking-tight"
              style={{ color: "white" }}
            >
              EasyToGive
            </span>
          </div>

          {/* Invite Only badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Lock style={{ width: 12, height: 12, color: "white" }} />
            <span className="text-xs font-semibold text-white tracking-wide">
              Invite Only
            </span>
          </div>
        </div>

        {/* ── HERO ────────────────────────────────────────────────── */}
        <div
          className="mx-auto px-4 text-center"
          style={{ maxWidth: 640, paddingTop: 56, paddingBottom: 16 }}
        >
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Coming Soon
          </p>

          <h1
            className="font-display font-bold leading-[1.05] mb-6"
            style={{
              fontSize: "clamp(36px, 7vw, 64px)",
              color: "white",
            }}
          >
            The Marketplace for Giving.
          </h1>

          <p
            className="leading-relaxed mx-auto"
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 520,
            }}
          >
            We&rsquo;re building the easiest way to discover verified
            organizations, build your giving portfolio, and donate to multiple
            causes with one transaction. Giving the way it should be.
          </p>
        </div>

        {/* ── WAITLIST FORM ────────────────────────────────────────── */}
        <div
          className="mx-auto px-4"
          style={{ maxWidth: 520, paddingTop: 32, paddingBottom: 8 }}
        >
          {status === "success" ? (
            <div
              className="flex items-center justify-center gap-2.5 py-4 rounded-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <CheckCircle style={{ width: 18, height: 18, color: "white" }} />
              <span className="text-white font-semibold text-sm">
                You&rsquo;re on the list. We&rsquo;ll be in touch.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                  placeholder="Enter your email address"
                  className="flex-1 outline-none text-gray-900 text-sm font-medium placeholder-gray-400"
                  style={{
                    height: 52,
                    borderRadius: 12,
                    padding: "0 18px",
                    backgroundColor: "white",
                    border: "none",
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="font-semibold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 whitespace-nowrap"
                  style={{
                    height: 52,
                    padding: "0 24px",
                    borderRadius: 12,
                    backgroundColor: "white",
                    color: "#1a7a4a",
                  }}
                >
                  {status === "loading" ? "Joining…" : "Join the Waitlist"}
                </button>
              </div>

              {/* Status messages */}
              {status === "duplicate" && (
                <p className="text-center text-sm mt-3" style={{ color: "rgba(255,255,255,0.75)" }}>
                  You&rsquo;re already on the waitlist!
                </p>
              )}
              {status === "invalid" && (
                <p className="text-center text-sm mt-3" style={{ color: "rgba(255,200,200,0.9)" }}>
                  Please enter a valid email address.
                </p>
              )}
              {status === "error" && (
                <p className="text-center text-sm mt-3" style={{ color: "rgba(255,200,200,0.9)" }}>
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          )}

          <p
            className="text-center text-xs mt-4"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Be among the first to experience EasyToGive. No spam, ever.
          </p>
        </div>

        {/* ── BLURRED APP TEASER ───────────────────────────────────── */}
        <div
          className="mx-auto px-4"
          style={{ maxWidth: 700, paddingTop: 56, paddingBottom: 8 }}
        >
          <div
            className="rounded-2xl overflow-hidden py-8 px-6"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(0,0,0,0.12)",
            }}
          >
            {/* Cards */}
            <div
              className="flex justify-center items-end gap-3"
              style={{ filter: "blur(5px)", opacity: 0.65 }}
            >
              <MockCard rotate={-4} opacity={0.7} />
              <MockCard rotate={0} opacity={1} />
              <MockCard rotate={3} opacity={0.75} />
            </div>
          </div>
          <p
            className="text-center text-xs mt-4"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            A glimpse of what&rsquo;s coming
          </p>
        </div>

        {/* ── MISSION STATEMENT ────────────────────────────────────── */}
        <div
          className="mx-auto px-4 text-center"
          style={{ maxWidth: 480, paddingTop: 56, paddingBottom: 56 }}
        >
          <div
            className="mb-8 mx-auto"
            style={{ height: 1, backgroundColor: "rgba(255,255,255,0.18)" }}
          />
          <p
            className="font-display leading-relaxed"
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.8)",
              fontStyle: "italic",
            }}
          >
            &ldquo;More giving. More organizations. More impact. We&rsquo;re
            making generosity effortless for everyone.&rdquo;
          </p>
          <div
            className="mt-8 mx-auto"
            style={{ height: 1, backgroundColor: "rgba(255,255,255,0.18)" }}
          />
        </div>

        {/* ── BOTTOM BAR ───────────────────────────────────────────── */}
        <div className="text-center pb-8 px-4">
          <p
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            &copy; 2026 EasyToGive, Inc. &middot; Built in Bismarck, ND
          </p>
        </div>
      </div>
    </div>
  );
}
