"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError("We couldn't send a reset email. Please check the address and try again.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ backgroundColor: "#faf9f6" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a7a4a" }}>
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-display text-2xl font-semibold text-gray-900">EasyToGive</span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-gray-900 mt-6 mb-1">
            {sent ? "Check your email" : "Reset your password"}
          </h1>
          <p className="text-gray-500 text-sm">
            {sent
              ? `We sent a reset link to ${email}`
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-8 shadow-sm" style={{ borderColor: "#e5e1d8" }}>
          {sent ? (
            <div className="text-center space-y-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: "#e8f5ee" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: "#1a7a4a" }} />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Click the link in the email to set a new password. If you don&apos;t see it,
                check your spam folder.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm font-medium hover:underline"
                style={{ color: "#1a7a4a" }}
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
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

              {error && (
                <div
                  className="flex items-start gap-2.5 p-3 rounded-lg border text-sm"
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: "#1a7a4a" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Remember your password?{" "}
            <Link href="/auth/signin" className="font-medium hover:underline" style={{ color: "#1a7a4a" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
