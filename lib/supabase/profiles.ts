import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error ?? !data) return null;

  return {
    id: data.id,
    display_name: data.display_name ?? null,
    avatar_url: data.avatar_url ?? null,
    created_at: data.created_at ?? "",
    updated_at: data.updated_at ?? "",
  };
}

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  return !error;
}
