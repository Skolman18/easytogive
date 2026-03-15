import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Donation Receipt ${id} — EasyToGive` };
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) notFound();

  // Auth check — must be logged in
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    redirect(`/auth/signin?redirectTo=/receipts/${encodeURIComponent(id)}`);
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: donation } = await admin
    .from("donations")
    .select("*, organizations(name, ein)")
    .eq("receipt_id", id)
    .single();

  if (!donation) notFound();

  // Verify the logged-in user owns this receipt (admin may view any)
  const ADMIN_EMAIL = "sethmitzel@gmail.com";
  if (donation.user_id !== user.id && user.email !== ADMIN_EMAIL) {
    notFound();
  }

  const orgName = (donation.organizations as any)?.name ?? "an organization";
  const orgEin: string | null = (donation.organizations as any)?.ein ?? null;
  const isRecurring = donation.receipt_id?.startsWith("ETG-REC-");
  const donatedAt = donation.donated_at ?? donation.created_at ?? new Date().toISOString();

  // Fetch donor name
  let donorName: string | null = null;
  if (donation.user_id) {
    const { data: profile } = await admin
      .from("users")
      .select("full_name")
      .eq("id", donation.user_id)
      .single();
    donorName = (profile as any)?.full_name || null;
  }

  return (
    <div style={{ backgroundColor: "#faf9f6", minHeight: "100vh" }}>
      {/* Top bar — hidden on print */}
      <div
        className="print:hidden bg-white border-b px-4 py-3 flex items-center justify-between"
        style={{ borderColor: "#e5e1d8" }}
      >
        <Link
          href="/profile?tab=receipts"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to receipts
        </Link>
        <PrintButton />
      </div>

      {/* Receipt card */}
      <div className="max-w-lg mx-auto px-4 py-10 print:py-4 print:max-w-none">
        <div
          className="bg-white rounded-2xl border overflow-hidden print:rounded-none print:border-0"
          style={{ borderColor: "#e5e1d8" }}
        >
          {/* Header */}
          <div className="px-8 py-7 text-center" style={{ backgroundColor: "#1a7a4a" }}>
            <p
              className="text-white text-2xl font-bold tracking-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              EasyToGive
            </p>
            <p className="text-green-200 text-sm mt-1">
              {isRecurring ? "Recurring Giving Receipt" : "Donation Receipt"}
            </p>
          </div>

          <div className="px-8 py-7">
            <h1
              className="text-xl font-bold text-gray-900 mb-1"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {isRecurring ? "Recurring giving confirmed" : "Thank you for your donation"}
            </h1>
            <p className="text-sm text-gray-500 mb-7">
              Your {isRecurring ? "recurring gift" : "gift"} to{" "}
              <strong className="text-gray-800">{orgName}</strong> has been processed.
            </p>

            {/* Details table */}
            <div
              className="rounded-xl border"
              style={{ borderColor: "#e5e1d8", backgroundColor: "#faf9f6" }}
            >
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ...(donorName ? [{ label: "Donor", value: donorName }] : []),
                    { label: "Organization", value: orgName },
                    ...(orgEin ? [{ label: "EIN", value: orgEin, mono: true }] : []),
                    {
                      label: isRecurring ? "Amount per period" : "Amount",
                      value: formatCents(donation.amount),
                      green: true,
                    },
                    { label: "Date", value: formatDate(donatedAt) },
                    ...(donation.fee_covered
                      ? [{ label: "Platform fee", value: "Covered by donor" }]
                      : []),
                  ].map(({ label, value, green, mono }: { label: string; value: string; green?: boolean; mono?: boolean }, i, arr) => (
                    <tr
                      key={label}
                      style={i < arr.length - 1 ? { borderBottom: "1px solid #e5e1d8" } : undefined}
                    >
                      <td className="px-5 py-3 text-gray-500">{label}</td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${green ? "" : "text-gray-800"} ${mono ? "font-mono" : ""}`}
                        style={green ? { color: "#1a7a4a" } : undefined}
                      >
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Receipt ID */}
            <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
              <span>Receipt ID</span>
              <span className="font-mono">{donation.receipt_id}</span>
            </div>

            {/* Tax notice */}
            <div
              className="mt-6 rounded-xl p-4"
              style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}
            >
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                <div className="text-xs text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">Tax Deductibility Notice</p>
                  <p>
                    No goods or services were provided in exchange for this contribution.
                    {orgEin && ` The EIN for ${orgName} is ${orgEin}.`}{" "}
                    This donation may be tax-deductible to the extent permitted by law.
                    Please retain this receipt for your records.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs text-gray-400 text-center leading-relaxed">
              You can view all your receipts at{" "}
              <span className="text-green-700">easytogive.online/profile</span>.
            </p>
          </div>

          <div
            className="px-8 py-4 text-center text-xs text-gray-400"
            style={{ backgroundColor: "#f9fafb", borderTop: "1px solid #e5e1d8" }}
          >
            EasyToGive · Giving made easy · easytogive.online
          </div>
        </div>
      </div>
    </div>
  );
}
