import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  // Authenticate the caller
  const serverSupabase = await createServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { orgId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { orgId } = body;
  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Look up the org
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, stripe_account_id, contact_email, owner_user_id")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Verify caller owns the org (or is admin)
    const isAdmin = user.email === ADMIN_EMAIL;
    const isOwner =
      (org as any).contact_email === user.email ||
      (org as any).owner_user_id === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    let accountId: string = (org as any).stripe_account_id ?? "";

    // Stamp owner_user_id the first time an org rep accesses their org
    // (invited users have contact_email set but owner_user_id is null until now)
    if (!isAdmin && !(org as any).owner_user_id) {
      await supabase
        .from("organizations")
        .update({ owner_user_id: user.id })
        .eq("id", orgId);
    }

    // Create a new Express account only if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: (org as any).name ?? undefined,
        },
      });
      accountId = account.id;

      await supabase
        .from("organizations")
        .update({ stripe_account_id: accountId })
        .eq("id", orgId);
    }

    // Generate a fresh onboarding link
    const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://easytogive.online";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/org/dashboard?stripe=refresh&orgId=${encodeURIComponent(orgId)}`,
      return_url: `${baseUrl}/org/dashboard?stripe=success&orgId=${encodeURIComponent(orgId)}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("connect/create-account error:", err);
    return NextResponse.json({ error: "Failed to create Connect account" }, { status: 500 });
  }
}
