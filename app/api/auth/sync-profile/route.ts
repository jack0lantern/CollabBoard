import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  let body: {
    uid: string;
    email?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { uid, displayName, firstName, lastName, avatarUrl } = body;

  if (!uid) {
    return NextResponse.json({ error: "uid is required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: uid,
      display_name: displayName ?? null,
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      avatar_url: avatarUrl ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[sync-profile] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
