import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { geminiKeySchema } from "@/lib/validation";
import { APP_ID } from "@/lib/config";
import { ENCRYPTION_KEY } from "@/lib/env";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_profiles")
    .select("gemini_api_key")
    .eq("user_id", user.id)
    .eq("app_id", APP_ID)
    .single();

  if (!data?.gemini_api_key) {
    return NextResponse.json({ hasKey: false, maskedKey: null });
  }

  try {
    const key = decrypt(data.gemini_api_key, ENCRYPTION_KEY);
    const masked = key.slice(0, 4) + "..." + "****";
    return NextResponse.json({ hasKey: true, maskedKey: masked });
  } catch {
    return NextResponse.json({ hasKey: false, maskedKey: null });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { geminiApiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = geminiKeySchema.safeParse(body.geminiApiKey);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 400 },
    );
  }

  const encrypted = encrypt(parsed.data, ENCRYPTION_KEY);

  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        app_id: APP_ID,
        gemini_api_key: encrypted,
      },
      { onConflict: "user_id,app_id" },
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("user_profiles")
    .update({ gemini_api_key: null })
    .eq("user_id", user.id)
    .eq("app_id", APP_ID);

  return NextResponse.json({ success: true });
}
