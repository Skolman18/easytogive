"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Target } from "lucide-react";

interface GivingGoal {
  id: string;
  goal_amount: number; // cents
  period_type: string;
  start_date: string;
  end_date: string;
  active: boolean;
}

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function relativeDate(isoDate: string): string {
  const target = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Goal period ended";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

export default function GivingGoalCard({ userId }: { userId: string }) {
  const [goal, setGoal] = useState<GivingGoal | null>(null);
  const [givenSoFar, setGivenSoFar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Form
  const [goalAmount, setGoalAmount] = useState("");
  const [periodType, setPeriodType] = useState<"calendar_year" | "custom">("calendar_year");
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-31`);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoal();
  }, [userId]);

  async function loadGoal() {
    const supabase = createClient() as any;

    const { data: goalData } = await supabase
      .from("giving_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setGoal(goalData || null);

    if (goalData) {
      const { data: donationData } = await supabase
        .from("donations")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", goalData.start_date)
        .lte("created_at", goalData.end_date + "T23:59:59Z");
      const total = (donationData || []).reduce(
        (sum: number, d: any) => sum + (d.amount || 0),
        0
      );
      setGivenSoFar(total);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!goalAmount || Number(goalAmount) <= 0) return;
    setSaving(true);
    const supabase = createClient() as any;
    const yr = new Date().getFullYear();
    const sd = periodType === "calendar_year" ? `${yr}-01-01` : startDate;
    const ed = periodType === "calendar_year" ? `${yr}-12-31` : endDate;

    // Deactivate existing active goals
    await supabase
      .from("giving_goals")
      .update({ active: false })
      .eq("user_id", userId)
      .eq("active", true);

    const { error } = await supabase.from("giving_goals").insert({
      user_id: userId,
      goal_amount: Math.round(Number(goalAmount) * 100),
      period_type: periodType,
      start_date: sd,
      end_date: ed,
      active: true,
    });

    setSaving(false);
    if (!error) {
      setEditing(false);
      loadGoal();
    }
  }

  async function handleRemove() {
    if (!goal) return;
    const supabase = createClient() as any;
    await supabase.from("giving_goals").update({ active: false }).eq("id", goal.id);
    setGoal(null);
    setGivenSoFar(0);
  }

  if (loading) return null;

  // ── Active goal display ──────────────────────────────────────────────────────
  if (goal && !editing) {
    const pct = Math.min(Math.round((givenSoFar / goal.goal_amount) * 100), 100);
    const goalReached = pct >= 100;
    const startD = new Date(goal.start_date);
    const endD = new Date(goal.end_date);
    const totalDays = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / 86400000));
    const daysLeft = Math.max(0, Math.ceil((endD.getTime() - Date.now()) / 86400000));
    const daysElapsed = Math.max(1, totalDays - daysLeft);
    const projectedAmount = Math.round((givenSoFar / daysElapsed) * totalDays);

    const goalLabel =
      goal.period_type === "calendar_year"
        ? `${startD.getFullYear()} Giving Goal`
        : `${startD.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endD.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    return (
      <div className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor: "#e5e1d8" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{goalLabel}</h3>
          <button
            onClick={() => { setGoalAmount(String(goal.goal_amount / 100)); setEditing(true); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Edit
          </button>
        </div>

        {goalReached ? (
          <div className="text-center py-3">
            <div className="text-3xl mb-2">🎯</div>
            <div className="font-display text-lg font-bold" style={{ color: "#1a7a4a" }}>
              Goal reached!
            </div>
            <p className="text-sm text-gray-600 mt-1">You gave {fmt(givenSoFar)} this year</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-2">
              <span className="font-display text-xl font-bold" style={{ color: "#1a7a4a" }}>
                {fmt(givenSoFar)}
              </span>
              <span className="text-sm text-gray-500">of {fmt(goal.goal_amount)} goal</span>
            </div>
            <div className="w-full h-4 rounded-full overflow-hidden mb-2" style={{ backgroundColor: "#e5e1d8" }}>
              <div
                className="h-4 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: "#1a7a4a" }}
              />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">{pct}% of your goal complete</p>
            <p className="text-xs text-gray-400 mb-3">{relativeDate(goal.end_date)}</p>
            {givenSoFar > 0 && daysLeft > 0 && (
              <p
                className="text-xs text-gray-500 px-3 py-2 rounded-lg mb-3"
                style={{ backgroundColor: "#f9f8f6" }}
              >
                At your current pace, you&apos;ll give {fmt(projectedAmount)} by year end
              </p>
            )}
          </>
        )}

        <div className="flex gap-3 pt-1 border-t" style={{ borderColor: "#f0ede6" }}>
          <button
            onClick={() => { setGoalAmount(String(goal.goal_amount / 100)); setEditing(true); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors pt-2"
          >
            Edit Goal
          </button>
          <span className="text-xs text-gray-300 pt-2">·</span>
          <button
            onClick={handleRemove}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors pt-2"
          >
            Remove Goal
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state / form ────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor: "#e5e1d8" }}>
      {!editing ? (
        <div className="text-center mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: "#f0ede6" }}
          >
            <Target className="w-5 h-5" style={{ color: "#d1cdc4" }} />
          </div>
          <h3 className="font-display text-gray-900 mb-1.5 text-sm">Set a Giving Goal</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Research shows people who set giving goals give 3× more. Set yours for this year.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Edit Giving Goal</h3>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Goal Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="w-full pl-7 pr-4 py-2.5 border rounded-lg text-sm text-gray-900 outline-none focus:border-green-600 transition-colors"
              style={{ borderColor: "#e5e1d8" }}
              placeholder="1,000"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
          <div className="flex gap-2">
            {(["calendar_year", "custom"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodType(p)}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors"
                style={
                  periodType === p
                    ? { backgroundColor: "#e8f5ee", color: "#1a7a4a", borderColor: "#1a7a4a" }
                    : { borderColor: "#e5e1d8", color: "#6b7280" }
                }
              >
                {p === "calendar_year" ? "This Calendar Year" : "Custom Range"}
              </button>
            ))}
          </div>
          {periodType === "calendar_year" && (
            <p className="text-xs text-gray-400 mt-1">
              Jan 1 – Dec 31, {new Date().getFullYear()}
            </p>
          )}
        </div>

        {periodType === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-green-600"
                style={{ borderColor: "#e5e1d8" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-green-600"
                style={{ borderColor: "#e5e1d8" }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !goalAmount || Number(goalAmount) <= 0}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1a7a4a" }}
        >
          {saving ? "Saving..." : "Set My Goal →"}
        </button>
      </div>
    </div>
  );
}
