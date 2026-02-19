import { createSupabaseClient } from "@/lib/supabase/client";

/** Database row shape for profiles table */
interface ProfileRow {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseClient();
  if (!supabase) return null;

  const result = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (result.error ?? !result.data) return null;

  const row = result.data as ProfileRow;
  return {
    id: row.id,
    display_name: row.display_name ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; first_name?: string; last_name?: string; avatar_url?: string }
): Promise<boolean> {
  const supabase = createSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  return !error;
}
