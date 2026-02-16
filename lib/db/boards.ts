import { supabase } from "./client";
import type { Board } from "@/types";

export async function getBoard(id: string): Promise<Board | null> {
  if (!supabase?.from) return null;
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Board;
}

export async function getBoardsByOwner(ownerId: string): Promise<Board[]> {
  if (!supabase?.from) return [];
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Board[];
}

export async function createBoard(
  title: string,
  ownerId: string
): Promise<Board | null> {
  if (!supabase?.from) return null;
  const { data, error } = await supabase
    .from("boards")
    .insert({ title, owner_id: ownerId })
    .select()
    .single();

  if (error) return null;
  return data as Board;
}

export async function updateBoardSnapshot(
  id: string,
  snapshot: Record<string, unknown>
): Promise<boolean> {
  if (!supabase?.from) return false;
  const { error } = await supabase
    .from("boards")
    .update({ last_snapshot: snapshot })
    .eq("id", id);

  return !error;
}
