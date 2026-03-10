"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, MapPin, Check } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

// ─── Causes ───────────────────────────────────────────────────────────────────

const CAUSES = [
  { id: "faith-church", label: "Faith & Church" },
  { id: "animals-rescue", label: "Animals & Rescue" },
  { id: "education", label: "Education" },
  { id: "environment", label: "Environment" },
  { id: "local-community", label: "Local Community" },
  { id: "food-hunger", label: "Food & Hunger" },
  { id: "housing-homelessness", label: "Housing & Homelessness" },
  { id: "international-aid", label: "International Aid" },
  { id: "health-medicine", label: "Health & Medicine" },
  { id: "children-youth", label: "Children & Youth" },
  { id: "arts-culture", label: "Arts & Culture" },
  { id: "veterans-military", label: "Veterans & Military" },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [selectedCauses, setSelectedCauses] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<"none" | "gps" | "manual">("none");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "success" | "error">("idle");
  const [gpsLabel, setGpsLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/signin?redirectTo=/onboarding");
        return;
      }
      setUserId(user.id);
      (supabase as any)
        .from("users")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single()
        .then(({ data }: { data: any }) => {
          if (data?.onboarding_complete) router.push("/discover");
        });
    });
  }, [router]);

  function toggleCause(id: string) {
    setSelectedCauses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function saveCausesAndAdvance() {
    if (!userId) return;
    setSaving(true);
    await (createClient() as any)
      .from("users")
      .upsert({ id: userId, causes: selectedCauses });
    setSaving(false);
    setScreen(2);
  }

  async function useGPS() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsLoading(true);
    setGpsStatus("idle");
    setLocationMode("gps");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { "User-Agent": "EasyToGive/1.0" } }
          );
          const data = await resp.json();
          const addr = data.address || {};
          const detectedCity = addr.city || addr.town || addr.village || "";
          const detectedState = addr.state || "";
          setCity(detectedCity);
          setStateVal(detectedState);
          setZip(addr.postcode || "");
          setGpsLabel(`${detectedCity}${detectedState ? `, ${detectedState}` : ""}`);
          setGpsStatus("success");
        } catch {
          setGpsStatus("error");
        }
        setGpsLoading(false);
      },
      () => {
        setGpsStatus("error");
        setGpsLoading(false);
      }
    );
  }

  async function finish(skip = false) {
    if (!userId) return;
    setSaving(true);
    const supabase = createClient() as any;
    let lat: number | null = null;
    let lng: number | null = null;

    if (!skip && city && stateVal) {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&state=${encodeURIComponent(stateVal)}&postalcode=${encodeURIComponent(zip)}&country=US&format=json&limit=1`,
          { headers: { "User-Agent": "EasyToGive/1.0" } }
        );
        const results = await resp.json();
        if (results[0]) {
          lat = parseFloat(results[0].lat);
          lng = parseFloat(results[0].lon);
        }
      } catch {
        // Non-fatal
      }
    }

    await supabase.from("users").upsert({
      id: userId,
      city: skip ? null : city || null,
      state: skip ? null : stateVal || null,
      zip: skip ? null : zip || null,
      lat,
      lng,
      onboarding_complete: true,
    });

    setSaving(false);
    router.push("/discover");
  }

  // Slide offset per screen
  const offset = screen * -100;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2.5 pt-8 flex-shrink-0">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === screen ? 24 : 8,
              height: 8,
              backgroundColor: i <= screen ? "#1a7a4a" : "#e5e1d8",
            }}
          />
        ))}
      </div>

      {/* Sliding screen container */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-400 ease-in-out"
          style={{ transform: `translateX(${offset}%)` }}
        >

          {/* ── SCREEN 0: Emotional Hook ─────────────────────────────── */}
          <div className="min-w-full flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-[480px] text-center">
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-6"
                style={{ color: "#1a7a4a" }}
              >
                Welcome to EasyToGive
              </p>

              <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] mb-6">
                Your generosity can change everything.
              </h1>

              <p className="text-gray-500 leading-relaxed mb-10">
                Millions of people want to give more — they just don&apos;t know where
                to start. EasyToGive connects you with causes you love, makes giving
                effortless, and shows you the real impact of every dollar.
              </p>

              {/* Stat lines */}
              <div className="space-y-3 mb-10 text-left">
                {[
                  "1.5 million+ verified nonprofits in the US",
                  "Recurring giving set up in under 60 seconds",
                  "Local and worldwide causes in one place",
                ].map((line) => (
                  <div
                    key={line}
                    className="flex items-center gap-3 pl-4 border-l-2 py-1"
                    style={{ borderColor: "#1a7a4a" }}
                  >
                    <p className="text-sm text-gray-700">{line}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setScreen(1)}
                className="w-full flex items-center justify-center gap-2 py-[14px] rounded-xl font-semibold text-white text-base transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                Show me what&rsquo;s possible
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setScreen(2)}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip intro
              </button>
            </div>
          </div>

          {/* ── SCREEN 1: Causes ─────────────────────────────────────── */}
          <div className="min-w-full flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-[560px]">
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-4 text-center"
                style={{ color: "#1a7a4a" }}
              >
                Step 2 of 3 — Personalize Your Experience
              </p>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-3 text-center">
                What causes matter to you?
              </h1>
              <p className="text-gray-500 text-sm text-center mb-8 max-w-sm mx-auto">
                Select the causes that resonate with you. We use this to surface
                organizations you&apos;ll actually care about — every recommendation
                tailored to you.
              </p>

              {/* Cause tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {CAUSES.map(({ id, label }) => {
                  const selected = selectedCauses.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleCause(id)}
                      className="relative flex items-center justify-center px-3 rounded-xl border-2 font-semibold text-sm transition-all hover:scale-105 text-center"
                      style={{
                        height: 72,
                        borderColor: selected ? "#1a7a4a" : "#e5e1d8",
                        backgroundColor: selected ? "#e8f5ee" : "white",
                        color: selected ? "#1a7a4a" : "#374151",
                      }}
                    >
                      {label}
                      {selected && (
                        <span
                          className="absolute top-1.5 right-1.5 rounded-full flex items-center justify-center"
                          style={{
                            width: 18,
                            height: 18,
                            backgroundColor: "#1a7a4a",
                          }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 italic text-center mb-8">
                Not sure yet? You can always update this in your profile settings.
              </p>

              <button
                onClick={saveCausesAndAdvance}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-[14px] rounded-xl font-semibold text-white text-base transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              <div className="text-center mt-4">
                <button
                  onClick={() => setScreen(2)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip this step
                </button>
              </div>
            </div>
          </div>

          {/* ── SCREEN 2: Location ───────────────────────────────────── */}
          <div className="min-w-full flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-[480px]">
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-4 text-center"
                style={{ color: "#1a7a4a" }}
              >
                Step 3 of 3 — Local Discovery
              </p>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-3 text-center">
                Want to find organizations near you?
              </h1>
              <p className="text-gray-500 text-sm text-center mb-8 max-w-sm mx-auto">
                Tell us where you are and we&apos;ll surface incredible causes right in
                your community. This is completely optional.
              </p>

              {/* Two option cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {/* GPS card */}
                <button
                  onClick={useGPS}
                  disabled={gpsLoading}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 text-center transition-all hover:border-green-600 disabled:opacity-60"
                  style={{
                    borderColor:
                      gpsStatus === "success"
                        ? "#1a7a4a"
                        : locationMode === "gps"
                        ? "#1a7a4a"
                        : "#e5e1d8",
                    backgroundColor:
                      gpsStatus === "success" ? "#e8f5ee" : "white",
                  }}
                >
                  {gpsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#1a7a4a" }} />
                  ) : gpsStatus === "success" ? (
                    <Check className="w-5 h-5" style={{ color: "#1a7a4a" }} />
                  ) : (
                    <MapPin className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: gpsStatus === "success" ? "#1a7a4a" : "#111827" }}
                    >
                      {gpsStatus === "success" ? gpsLabel || "Detected" : "Use My Location"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {gpsStatus === "success"
                        ? "Location confirmed"
                        : "Detect automatically"}
                    </div>
                  </div>
                </button>

                {/* Manual card */}
                <button
                  onClick={() => setLocationMode(locationMode === "manual" ? "none" : "manual")}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 text-center transition-all hover:border-green-600"
                  style={{
                    borderColor: locationMode === "manual" ? "#1a7a4a" : "#e5e1d8",
                    backgroundColor: locationMode === "manual" ? "#e8f5ee" : "white",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded border-2 flex items-center justify-center"
                    style={{ borderColor: locationMode === "manual" ? "#1a7a4a" : "#9ca3af" }}
                  >
                    {locationMode === "manual" && (
                      <Check className="w-3 h-3" style={{ color: "#1a7a4a" }} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Enter Manually</div>
                    <div className="text-xs text-gray-400 mt-0.5">Type your city or zip</div>
                  </div>
                </button>
              </div>

              {/* Manual inputs — shown when manual selected */}
              {locationMode === "manual" && (
                <div className="grid grid-cols-5 gap-2 mb-5">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="col-span-3 px-4 py-2.5 border rounded-xl text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                  <input
                    type="text"
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="ST"
                    className="col-span-1 px-2 py-2.5 border rounded-xl text-sm text-gray-900 uppercase outline-none focus:border-green-600 transition-colors text-center"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    maxLength={5}
                    placeholder="ZIP"
                    className="col-span-1 px-2 py-2.5 border rounded-xl text-sm text-gray-900 outline-none focus:border-green-600 transition-colors text-center"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                </div>
              )}

              {gpsStatus === "error" && (
                <p className="text-xs text-red-500 text-center mb-4">
                  Could not access your location. Please enter it manually.
                </p>
              )}

              <p className="text-xs text-gray-400 text-center mb-6">
                Your location is only used to show nearby organizations. We never share or sell your data.
              </p>

              <button
                onClick={() => finish(false)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-[14px] rounded-xl font-semibold text-white text-base transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Take me to EasyToGive <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              <div className="text-center mt-4">
                <button
                  onClick={() => finish(true)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip — take me to the app
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom brand */}
      <div className="text-center pb-8 flex-shrink-0">
        <span className="text-xs text-gray-300">
          EasyToGive — Charitable giving, simplified
        </span>
      </div>
    </div>
  );
}
