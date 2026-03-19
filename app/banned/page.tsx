import { Ban } from "lucide-react";

export default function BannedPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
          <Ban className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-[#111827] mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
          Account Banned
        </h1>
        <p className="text-[#6b7280] mb-6 leading-relaxed">
          Your account has been permanently banned from EasyToGive.
        </p>
        <a
          href="mailto:support@easytogive.online"
          className="inline-block text-sm text-[#6b7280] hover:text-[#111827]"
        >
          Contact support@easytogive.online if you believe this is an error.
        </a>
      </div>
    </div>
  );
}
