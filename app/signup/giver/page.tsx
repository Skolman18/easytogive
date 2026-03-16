"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const INTERESTS = [
  { value: "nonprofits", label: "Nonprofits" },
  { value: "churches", label: "Churches & Faith" },
  { value: "animal-rescue", label: "Animal Rescue" },
  { value: "education", label: "Education" },
  { value: "environment", label: "Environment" },
  { value: "local", label: "Local Causes" },
];

export default function GiverSignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    zip: "",
    interests: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function toggleInterest(val: string) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(val)
        ? prev.interests.filter((i) => i !== val)
        : [...prev.interests, val],
    }));
  }

  const pwRules = {
    length: form.password.length >= 8,
    number: /\d/.test(form.password),
    special: /[^a-zA-Z0-9]/.test(form.password),
  };
  const pwValid = pwRules.length && pwRules.number && pwRules.special;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pwValid) {
      setError("Password must be at least 8 characters and include a number and special character.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: form.name,
          zip: form.zip,
          interests: form.interests,
          account_type: "giver",
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already exists")) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (msg.includes("password")) {
        setError("Password doesn't meet requirements. Please choose a stronger password.");
      } else if (msg.includes("invalid email")) {
        setError("Please enter a valid email address.");
      } else {
        setError("Something went wrong creating your account. Please try again.");
      }
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#e8f5ee" }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: "#1a7a4a" }} />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-3">
            Welcome to EasyToGive!
          </h1>
          <p className="text-gray-500 mb-8">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-gray-800">{form.email}</span>.
            Click it to activate your account.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-6 py-3 rounded-full font-semibold text-white text-sm"
            style={{ backgroundColor: "#1a7a4a" }}
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-16">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1a7a4a" }}
            >
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-display text-xl font-semibold text-gray-900">
              EasyToGive
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-gray-900 mt-6 mb-1">
            Create your giver account
          </h1>
          <p className="text-gray-500 text-sm">
            Start giving smarter in under a minute.
          </p>
        </div>

        <div
          className="bg-white rounded-2xl border p-8 shadow-sm"
          style={{ borderColor: "#e5e1d8" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="name"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="Jane Smith"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="jane@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="••••••••"
              />
              {form.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[
                    { ok: pwRules.length, label: "At least 8 characters" },
                    { ok: pwRules.number, label: "Contains a number" },
                    { ok: pwRules.special, label: "Contains a special character" },
                  ].map(({ ok, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs">
                      <span style={{ color: ok ? "#1a7a4a" : "#9ca3af" }}>{ok ? "✓" : "○"}</span>
                      <span style={{ color: ok ? "#1a7a4a" : "#9ca3af" }}>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Zip code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Zip code{" "}
                <span className="text-gray-400 font-normal">(to find local causes)</span>
              </label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                autoComplete="postal-code"
                maxLength={10}
                className="w-full px-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
                style={{ borderColor: "#e5e1d8" }}
                placeholder="90210"
              />
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giving interests{" "}
                <span className="text-gray-400 font-normal">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => {
                  const active = form.interests.includes(interest.value);
                  return (
                    <button
                      key={interest.value}
                      type="button"
                      onClick={() => toggleInterest(interest.value)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={
                        active
                          ? { backgroundColor: "#1a7a4a", color: "white" }
                          : { backgroundColor: "#f3f4f6", color: "#374151" }
                      }
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
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
              className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <Link href="/auth/signin" className="font-medium hover:underline" style={{ color: "#1a7a4a" }}>
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
