import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  // Exchange code for session first
  const supabase = await createClient();
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // If a specific `next` destination was requested (e.g. org rep invite link),
  // go there directly — skip onboarding check.
  // Validate by resolving against the current origin and confirming origin match.
  if (next) {
    try {
      const resolved = new URL(next, requestUrl.origin);
      if (resolved.origin === requestUrl.origin) {
        return NextResponse.redirect(resolved);
      }
    } catch {
      // Invalid URL — fall through to default redirect
    }
  }

  // For new givers: check if onboarding is needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_complete, suspended, banned")
      .eq("id", user.id)
      .maybeSingle();

    const p = profile as any;

    if (p?.banned) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/banned", requestUrl.origin));
    }
    if (p?.suspended) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/suspended", requestUrl.origin));
    }

    if (!p?.onboarding_complete) {
      return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/discover", requestUrl.origin));
}
