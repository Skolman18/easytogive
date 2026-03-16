"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Heart, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

function SignInForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirectTo") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password") || msg.includes("email not confirmed")) {
        setError("Incorrect email or password. Please try again.");
      } else if (msg.includes("too many")) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setError("Sign-in failed. Please check your email and password.");
      }
      setLoading(false);
    } else {
      // Only allow same-origin redirects to prevent open-redirect abuse.
      let dest = "/discover";
      try {
        const resolved = new URL(rawRedirect, window.location.origin);
        if (resolved.origin === window.location.origin) {
          dest = resolved.pathname + resolved.search;
        }
      } catch { /* invalid URL — keep default */ }
      // Hard navigation: ensures cookies are sent with the next request and
      // avoids router.push + router.refresh() conflicts in Next.js App Router.
      window.location.href = dest;
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: "#faf9f6" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-display text-2xl font-semibold text-gray-900">
              EasyToGive
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-gray-900 mt-6 mb-1">
            Welcome back
          </h1>
          <p className="text-gray-500 text-sm">Sign in to your giving account</p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl border p-8 shadow-sm"
          style={{ borderColor: "#e5e1d8" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium hover:underline py-2 inline-block"
                  style={{ color: "#1a7a4a" }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-lg border text-sm"
                style={{
                  backgroundColor: "#fef2f2",
                  borderColor: "#fca5a5",
                  color: "#dc2626",
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/get-started"
              className="font-medium hover:underline"
              style={{ color: "#1a7a4a" }}
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
