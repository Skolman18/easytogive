"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart, ArrowLeft, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "#faf9f6" }}>
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a7a4a" }}>
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-display text-2xl font-semibold text-gray-900">EasyToGive</span>
        </div>

        <div className="font-display text-8xl font-bold mb-4" style={{ color: "#e5e1d8" }}>
          Oops
        </div>

        <h1 className="font-display text-2xl font-bold text-gray-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          An unexpected error occurred. Please try again — if the problem persists, contact us at{" "}
          <a href="mailto:seth@easytogive.online" className="underline" style={{ color: "#1a7a4a" }}>
            seth@easytogive.online
          </a>
          .
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "#e5e1d8", color: "#374151", backgroundColor: "white" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
