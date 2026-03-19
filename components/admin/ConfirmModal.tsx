"use client";
import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  onConfirm: (reason?: string) => Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  requireReason = false,
  reasonLabel = "Reason",
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError(`${reasonLabel} is required`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-[#111827] text-lg" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>{title}</h3>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#111827]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-[#6b7280] mb-4">{message}</p>
        {requireReason && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#111827] mb-1">{reasonLabel}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-[#e5e1d8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a7a4a]"
              placeholder="Enter reason..."
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#e5e1d8] text-sm text-[#6b7280] hover:bg-[#faf9f6]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
