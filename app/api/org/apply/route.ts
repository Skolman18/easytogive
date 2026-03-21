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

function generateOrgSlug(orgName: string): string {
  return orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  if (!/[^a-zA-Z0-9]/.test(password)) return "Password must contain at least one special character.";
  return null;
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(ip, "org-apply", 5, 60 * 60 * 1000);
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
    password?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { org_name, contact_name, email, website, ein, category, subcategory, description, password } = body;

  // Validate required fields
  if (!org_name?.trim()) return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  if (!contact_name?.trim()) return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "A brief description of your mission is required." }, { status: 400 });
  if (!category?.trim()) return NextResponse.json({ error: "Category is required." }, { status: 400 });
  if (!VALID_CATEGORIES.includes(category.trim())) return NextResponse.json({ error: "Invalid category." }, { status: 400 });

  // Step 1: Validate password server-side
  const passwordError = validatePassword(password ?? "");
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  // Step 2: Create auth user (email_confirm: true skips verification email)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: password!,
    email_confirm: true,
    user_metadata: { account_type: "organization", org_name: org_name.trim() },
  });

  if (authError) {
    const alreadyExists =
      authError.message.toLowerCase().includes("already registered") ||
      authError.message.toLowerCase().includes("already been registered") ||
      authError.message.toLowerCase().includes("already exists");
    if (alreadyExists) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }
    console.error("Auth user creation failed:", authError.message);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }

  const userId = authData.user.id;

  // Step 3: Insert org_applications
  const { data: appData, error: appError } = await supabase.from("org_applications").insert({
    org_name: org_name.trim().slice(0, 200),
    contact_name: contact_name.trim().slice(0, 200),
    email: normalizedEmail.slice(0, 200),
    website: (website ?? "").trim().slice(0, 500),
    ein: (ein ?? "").trim().slice(0, 20),
    category: category.trim().slice(0, 50),
    subcategory: (subcategory ?? "").trim().slice(0, 50),
    description: description.trim().slice(0, 2000),
    status: "pending",
  }).select("id").single();

  if (appError) {
    console.error("org_applications insert error:", appError);
    const { error: rollbackAuthErr } = await supabase.auth.admin.deleteUser(userId);
    if (rollbackAuthErr) console.error("Rollback failed — auth user orphaned:", userId, rollbackAuthErr.message);
    return NextResponse.json({ error: "Failed to submit application. Please try again." }, { status: 500 });
  }

  // Step 4: Generate org slug (check for collision)
  const baseSlug = generateOrgSlug(org_name.trim());
  let orgSlug = baseSlug;
  const { data: existingSlug } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", baseSlug)
    .maybeSingle();
  if (existingSlug) {
    orgSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Step 5: Insert organizations row (visible: false — hidden until approved)
  const { error: orgError } = await supabase.from("organizations").insert({
    id: orgSlug,
    name: org_name.trim().slice(0, 200),
    tagline: "",
    description: description.trim().slice(0, 2000),
    category: category.trim().slice(0, 50),
    subcategory: (subcategory ?? "").trim().slice(0, 50) || null,
    contact_email: normalizedEmail,
    ein: (ein ?? "").trim().slice(0, 20) || null,
    website: (website ?? "").trim().slice(0, 500) || null,
    visible: false,
    verified: false,
    featured: false,
    raised: 0,
    goal: 0,
    donors: 0,
    owner_user_id: userId,
  });

  if (orgError) {
    console.error("organizations insert error:", orgError);
    const { error: rollbackAuthErr2 } = await supabase.auth.admin.deleteUser(userId);
    if (rollbackAuthErr2) console.error("Rollback failed — auth user orphaned:", userId, rollbackAuthErr2.message);
    if (appData?.id) {
      const { error: rollbackAppErr } = await supabase.from("org_applications").delete().eq("id", appData.id);
      if (rollbackAppErr) console.error("Rollback failed — org_applications orphaned:", appData.id, rollbackAppErr.message);
    }
    return NextResponse.json({ error: "Failed to create organization profile. Please try again." }, { status: 500 });
  }

  // Step 6: Insert users row (onboarding_complete: true prevents donor onboarding redirect)
  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    email: normalizedEmail,
    full_name: contact_name.trim().slice(0, 200),
    onboarding_complete: true,
  });

  if (userError) {
    console.error("users insert error:", userError);
    const { error: rollbackAuthErr3 } = await supabase.auth.admin.deleteUser(userId);
    if (rollbackAuthErr3) console.error("Rollback failed — auth user orphaned:", userId, rollbackAuthErr3.message);
    if (appData?.id) {
      const { error: rollbackAppErr2 } = await supabase.from("org_applications").delete().eq("id", appData.id);
      if (rollbackAppErr2) console.error("Rollback failed — org_applications orphaned:", appData.id, rollbackAppErr2.message);
    }
    const { error: rollbackOrgErr } = await supabase.from("organizations").delete().eq("id", orgSlug);
    if (rollbackOrgErr) console.error("Rollback failed — organizations orphaned:", orgSlug, rollbackOrgErr.message);
    return NextResponse.json({ error: "Failed to set up account. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
