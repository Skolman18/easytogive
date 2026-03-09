"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, X, Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const PROMPT_KEY = "etg_location_prompted";
const LOCATION_KEY = "etg_user_location";

export default function LocationPrompt() {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"choose" | "manual" | "loading" | "done" | "error">("choose");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (localStorage.getItem(PROMPT_KEY)) return;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) return;
        setTimeout(() => setShow(true), 1500);
      });
  }, []);

  function dismiss() {
    localStorage.setItem(PROMPT_KEY, "1");
    setShow(false);
  }

  async function saveToDb(payload: Record<string, unknown>) {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await (supabase as any)
        .from("users")
        .upsert({ id: userData.user.id, ...payload });
    } catch {
      // DB columns may not exist yet — silently ignore, localStorage backup covers it
    }
  }

  async function handleGeolocate() {
    setMode("loading");
    setErrorMsg("");

    if (!navigator.geolocation) {
      setErrorMsg("Geolocation isn't supported by your browser.");
      setMode("manual");
      return;
    }

    // Race geolocation against a 10s timeout
    const geoPromise = new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        maximumAge: 60000,
      });
    });

    try {
      const pos = await geoPromise;
      const { latitude, longitude } = pos.coords;

      // Save to localStorage immediately (works without DB migration)
      localStorage.setItem(
        LOCATION_KEY,
        JSON.stringify({ lat: latitude, lng: longitude })
      );

      // Best-effort DB save (lat/lng columns may not exist yet)
      await saveToDb({ lat: latitude, lng: longitude });

      localStorage.setItem(PROMPT_KEY, "1");
      setMode("done");
      setTimeout(() => setShow(false), 1800);
    } catch (err: any) {
      const denied =
        err?.code === 1 || // PERMISSION_DENIED
        err?.message?.toLowerCase().includes("denied");
      setErrorMsg(
        denied
          ? "Location access was denied — enter your location manually instead."
          : "Couldn't get your location. Try entering it manually."
      );
      setMode("manual");
    }
  }

  async function handleManualSave() {
    if (!zip && !city) {
      setErrorMsg("Please enter at least a city or ZIP code.");
      return;
    }
    setMode("loading");

    const payload: Record<string, string> = {
      city,
      state: stateVal,
      zip,
    };

    // Save city/state/zip to localStorage
    localStorage.setItem(LOCATION_KEY, JSON.stringify(payload));

    // Best-effort DB save
    await saveToDb(payload);

    localStorage.setItem(PROMPT_KEY, "1");
    setMode("done");
    setTimeout(() => setShow(false), 1800);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#e8f5ee" }}
          >
            <MapPin className="w-5 h-5" style={{ color: "#1a7a4a" }} />
          </div>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Done */}
        {mode === "done" && (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#1a7a4a" }} />
            <p className="text-lg font-semibold text-gray-900 mb-1">Location saved!</p>
            <p className="text-sm text-gray-500">We&apos;ll show you local causes near you.</p>
          </div>
        )}

        {/* Loading */}
        {mode === "loading" && (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#1a7a4a" }} />
            <p className="text-sm text-gray-500">Getting your location…</p>
          </div>
        )}

        {/* Choose / Manual */}
        {(mode === "choose" || mode === "manual") && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Where are you located?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              We&apos;ll show you local causes and organizations near you.
            </p>

            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
                {errorMsg}
              </p>
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
                  onClick={() => { setErrorMsg(""); setMode("manual"); }}
                  className="w-full py-3 rounded-xl font-semibold text-sm border transition-all hover:bg-gray-50"
                  style={{ borderColor: "#e5e1d8", color: "#374151" }}
                >
                  Enter Manually
                </button>
                <button
                  onClick={dismiss}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
                >
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
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="State (e.g. TX)"
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm outline-none focus:border-green-600 uppercase"
                    style={{ borderColor: "#e5e1d8" }}
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
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
                <button
                  onClick={() => { setErrorMsg(""); setMode("choose"); }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  ← Back
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
