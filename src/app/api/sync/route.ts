import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { projectDataSchema, projectNameSchema, validatePayloadSize } from "@/lib/validation";
import { APP_ID } from "@/lib/config";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/sync");

/** Lightweight sync endpoint for navigator.sendBeacon on page unload. */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: string; name?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, name, data } = body;
  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const nameResult = projectNameSchema.safeParse(name);
  if (!nameResult.success) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const dataResult = projectDataSchema.safeParse(data);
  if (!dataResult.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  if (!validatePayloadSize(data)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const { error } = await supabase.from("projects").upsert(
    {
      id: projectId,
      user_id: user.id,
      app_id: APP_ID,
      name: nameResult.data,
      data: dataResult.data as unknown as Record<string, unknown>,
    },
    { onConflict: "id" },
  );

  if (error) {
    log.error("Sync failed", error.message);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
