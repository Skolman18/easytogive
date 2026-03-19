import Link from "next/link";
import { Shield } from "lucide-react";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-semibold text-[#111827] mb-3" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>
          Account Suspended
        </h1>
        <p className="text-[#6b7280] mb-6 leading-relaxed">
          Your account has been temporarily suspended. If you believe this is a mistake, please contact us.
        </p>
        <a
          href="mailto:support@easytogive.online"
          className="inline-block bg-[#1a7a4a] text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-[#155f3a] transition-colors"
        >
          Contact support@easytogive.online
        </a>
        <div className="mt-4">
          <Link href="/auth/signin" className="text-sm text-[#6b7280] hover:text-[#111827]">
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
