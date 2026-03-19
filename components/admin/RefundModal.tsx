"use client";
import { useState } from "react";
import { X, CreditCard } from "lucide-react";

interface Props {
  donation: {
    id: string;
    amount: number;
    userEmail: string;
    org_name: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundModal({ donation, onClose, onSuccess }: Props) {
  const [amountCents, setAmountCents] = useState(donation.amount);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProceed = () => {
    if (!reason.trim()) { setError("Reason is required"); return; }
    if (amountCents <= 0 || amountCents > donation.amount) {
      setError("Invalid refund amount"); return;
    }
    setError("");
    setStep("confirm");
  };

  const handleRefund = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId: donation.id, amount: amountCents, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refund failed");
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e8f5ee] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#1a7a4a]" />
            </div>
            <h3 className="font-semibold text-[#111827] text-lg">Issue Refund</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6b7280]" /></button>
        </div>

        {step === "form" ? (
          <>
            <div className="mb-4 p-3 bg-[#faf9f6] rounded-lg text-sm text-[#6b7280]">
              <div>Donor: <span className="text-[#111827] font-medium">{donation.userEmail}</span></div>
              <div>Organization: <span className="text-[#111827] font-medium">{donation.org_name || "Unknown"}</span></div>
              <div>Original amount: <span className="text-[#111827] font-medium">{formatCents(donation.amount)}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111827] mb-1">Refund amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(donation.amount / 100).toFixed(2)}
                  value={(amountCents / 100).toFixed(2)}
                  onChange={(e) => setAmountCents(Math.round(parseFloat(e.target.value) * 100))}
                  className="w-full border border-[#e5e1d8] rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#111827] mb-1">Reason (required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full border border-[#e5e1d8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
                placeholder="Reason for refund..."
              />
            </div>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#e5e1d8] text-sm text-[#6b7280]">Cancel</button>
              <button onClick={handleProceed} className="px-4 py-2 rounded-lg bg-[#1a7a4a] text-white text-sm font-medium hover:bg-[#155f3a]">
                Review Refund
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p className="font-medium mb-1">Confirm refund</p>
              <p>Refund <strong>{formatCents(amountCents)}</strong> to <strong>{donation.userEmail}</strong> for <strong>{donation.org_name}</strong>?</p>
              <p className="mt-1 text-amber-600">Reason: {reason}</p>
              <p className="mt-1 text-amber-600 text-xs">This action will immediately issue a refund through Stripe and cannot be undone.</p>
            </div>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setStep("form")} className="px-4 py-2 rounded-lg border border-[#e5e1d8] text-sm text-[#6b7280]">Back</button>
              <button onClick={handleRefund} disabled={loading} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {loading ? "Processing..." : `Refund ${formatCents(amountCents)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
