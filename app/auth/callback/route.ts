import { createClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

    // Check if user needs onboarding
    if (sessionData?.user) {
      const { data: profile } = await (supabase as any)
        .from("users")
        .select("onboarding_complete")
        .eq("id", sessionData.user.id)
        .single();

      if (!profile?.onboarding_complete) {
        return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/discover", requestUrl.origin));
}
