"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-16"
        style={{ backgroundColor: "#faf9f6" }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#e8f5ee" }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: "#1a7a4a" }} />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-3">
            Check your email
          </h1>
          <p className="text-gray-500 mb-8">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-gray-800">{email}</span>.
            Click it to activate your account, then sign in.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white text-sm"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
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
            Start giving today
          </h1>
          <p className="text-gray-500 text-sm">
            Create your free EasyToGive account
          </p>
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
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password{" "}
                <span className="text-gray-400 font-normal">(min. 6 characters)</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg border text-sm"
                style={{
                  backgroundColor: "#fef2f2",
                  borderColor: "#fca5a5",
                  color: "#dc2626",
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="font-medium hover:underline"
              style={{ color: "#1a7a4a" }}
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
