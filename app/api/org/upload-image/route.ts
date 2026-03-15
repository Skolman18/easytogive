import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";

export const dynamic = "force-dynamic";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

  // Auth check
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const orgId = formData.get("orgId") as string | null;
  const imageType = formData.get("type") as string | null; // "logo" | "cover"

  if (!file || !orgId || !imageType) {
    return NextResponse.json({ error: "file, orgId, and type are required." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });
  }

  // Verify magic bytes — clients can spoof the Content-Type header
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng  = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46
              && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  const isGif  = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38;
  if (!isJpeg && !isPng && !isWebp && !isGif) {
    return NextResponse.json({ error: "File does not appear to be a valid image." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Verify caller owns this org (or is admin)
  const isAdmin = user.email === ADMIN_EMAIL;
  if (!isAdmin) {
    const { data: org } = await admin
      .from("organizations")
      .select("contact_email, owner_user_id")
      .eq("id", orgId)
      .single();

    if (!org || (org.contact_email !== user.email && org.owner_user_id !== user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  // Build a stable file path: orgId/logo.ext or orgId/cover.ext
  const ext = file.type.toLowerCase().split("/")[1].replace("jpeg", "jpg");
  const path = `${orgId}/${imageType}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("org-images")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true, // replace existing
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("org-images").getPublicUrl(path);

  // Bust cache by appending a timestamp
  const url = `${publicUrl}?t=${Date.now()}`;

  // Auto-save the URL to the organizations table
  const field = imageType === "cover" ? "cover_url" : "image_url";
  await admin.from("organizations").update({ [field]: url }).eq("id", orgId);

  return NextResponse.json({ url });
}
