"use client";

/**
 * Renders a sticky "Staging" bar when NEXT_PUBLIC_APP_ENV=staging.
 * Set that env var only in your Vercel staging project so production never shows it.
 */
export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") {
    return null;
  }

  return (
    <div
      className="sticky top-0 z-[100] flex items-center justify-center py-1.5 text-xs font-semibold text-amber-900 bg-amber-400"
      role="status"
      aria-label="Staging environment"
    >
      Staging — not the live site. Safe to experiment here.
    </div>
  );
}
