"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const PROMPT_KEY = "etg_location_prompted";

export default function LocationPrompt() {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"choose" | "manual" | "loading" | "done">("choose");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Only show for logged-in users who haven't been prompted yet
    const alreadyPrompted = localStorage.getItem(PROMPT_KEY);
    if (alreadyPrompted) return;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      // Check if they already have a location set
      const { data: profile } = await (supabase as any)
        .from("users")
        .select("lat")
        .eq("id", data.user.id)
        .single();
      if (profile?.lat) {
        localStorage.setItem(PROMPT_KEY, "1");
        return;
      }
      // Show after a short delay
      setTimeout(() => setShow(true), 1500);
    });
  }, []);

  function dismiss() {
    localStorage.setItem(PROMPT_KEY, "1");
    setShow(false);
  }

  async function saveLocation(lat: number, lng: number, cityVal?: string, stateVal?: string, zipVal?: string) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await (supabase as any)
      .from("users")
      .upsert({
        id: userData.user.id,
        lat,
        lng,
        city: cityVal ?? "",
        state: stateVal ?? "",
        zip: zipVal ?? "",
      });
    localStorage.setItem(PROMPT_KEY, "1");
    setMode("done");
    setTimeout(() => setShow(false), 1500);
  }

  async function handleGeolocate() {
    setMode("loading");
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setMode("manual");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Try reverse geocode via browser-safe approach (no API key needed for basic use)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const geo = await res.json();
          const addr = geo.address ?? {};
          await saveLocation(
            latitude,
            longitude,
            addr.city ?? addr.town ?? addr.village ?? "",
            addr.state ?? "",
            addr.postcode ?? ""
          );
        } catch {
          await saveLocation(latitude, longitude);
        }
      },
      () => {
        setError("Location access was denied. Please enter your location manually.");
        setMode("manual");
      }
    );
  }

  async function handleManualSave() {
    if (!zip && !city) {
      setError("Please enter at least a city or ZIP code.");
      return;
    }
    setMode("loading");
    // Geocode via Nominatim
    try {
      const query = zip || `${city}, ${state}`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`
      );
      const results = await res.json();
      if (results.length > 0) {
        await saveLocation(parseFloat(results[0].lat), parseFloat(results[0].lon), city, state, zip);
      } else {
        // Save without lat/lng
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await (supabase as any).from("users").upsert({ id: userData.user.id, city, state, zip, lat: null, lng: null });
        }
        localStorage.setItem(PROMPT_KEY, "1");
        setMode("done");
        setTimeout(() => setShow(false), 1500);
      }
    } catch {
      setMode("manual");
      setError("Could not geocode that location. Please try again.");
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e8f5ee" }}>
            <MapPin className="w-5 h-5" style={{ color: "#1a7a4a" }} />
          </div>
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === "done" ? (
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-gray-900 mb-1">Location saved!</p>
            <p className="text-sm text-gray-500">We&apos;ll show you local causes near you.</p>
          </div>
        ) : mode === "loading" ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-green-600" />
            <p className="text-sm text-gray-500">Getting your location…</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Where are you located?</h2>
            <p className="text-sm text-gray-500 mb-5">
              We&apos;ll show you local causes and organizations near you.
            </p>

            {error && (
              <p className="text-sm text-red-500 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {mode === "choose" && (
              <div className="space-y-3">
                <button
                  onClick={handleGeolocate}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  <Navigation className="w-4 h-4" />
                  Use My Location
                </button>
                <button
                  onClick={() => setMode("manual")}
                  className="w-full py-3 rounded-xl font-semibold text-sm border transition-all hover:bg-gray-50"
                  style={{ borderColor: "#e5e1d8", color: "#374151" }}
                >
                  Enter Manually
                </button>
                <button onClick={dismiss} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                  Skip for now
                </button>
              </div>
            )}

            {mode === "manual" && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none focus:border-green-600"
                  style={{ borderColor: "#e5e1d8" }}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none focus:border-green-600 uppercase"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    maxLength={5}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none focus:border-green-600"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                </div>
                <button
                  onClick={handleManualSave}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#1a7a4a" }}
                >
                  Save Location
                </button>
                <button onClick={dismiss} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                  Skip for now
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
