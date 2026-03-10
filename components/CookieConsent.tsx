"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("cookie_consent") !== "accepted") {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white"
      style={{ borderColor: "#e5e1d8" }}
    >
      <p className="text-sm text-gray-600">
        We use essential cookies to keep you signed in. No tracking or advertising cookies.{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 font-medium"
          style={{ color: "#1a7a4a" }}
        >
          Privacy Policy
        </Link>
      </p>
      <button
        onClick={accept}
        className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#1a7a4a" }}
      >
        Got it
      </button>
    </div>
  );
}
