import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["community"];

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(ip, "org-apply", 5, 60 * 60 * 1000); // 5 per hour
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: {
    org_name?: string;
    contact_name?: string;
    email?: string;
    website?: string;
    ein?: string;
    category?: string;
    subcategory?: string;
    description?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { org_name, contact_name, email, website, ein, category, subcategory, description } = body;

  if (!org_name?.trim()) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }
  if (!contact_name?.trim()) {
    return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
  }
  if (!email?.trim() || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: "A brief description of your mission is required." }, { status: 400 });
  }
  if (!category?.trim()) {
    return NextResponse.json({ error: "Category is required." }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category.trim())) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("org_applications").insert({
    org_name: org_name.trim().slice(0, 200),
    contact_name: (contact_name ?? "").trim().slice(0, 200),
    email: email.trim().toLowerCase().slice(0, 200),
    website: (website ?? "").trim().slice(0, 500),
    ein: (ein ?? "").trim().slice(0, 20),
    category: category.trim().slice(0, 50),
    subcategory: (subcategory ?? "").trim().slice(0, 50),
    description: (description ?? "").trim().slice(0, 2000),
    status: "pending",
  });

  if (error) {
    console.error("org_applications insert error:", error);
    return NextResponse.json({ error: "Failed to submit application. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
