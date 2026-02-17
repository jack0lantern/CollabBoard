import { getDb } from "@/lib/firebase/admin";

const PROFILES_COLLECTION = "profiles";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const db = getDb();
  if (!db) return null;

  const doc = await db.collection(PROFILES_COLLECTION).doc(userId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  return {
    id: doc.id,
    display_name: data?.display_name ?? null,
    avatar_url: data?.avatar_url ?? null,
    created_at: data?.created_at?.toDate?.()?.toISOString?.() ?? "",
    updated_at: data?.updated_at?.toDate?.()?.toISOString?.() ?? "",
  } as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    await db.collection(PROFILES_COLLECTION).doc(userId).set(
      {
        ...updates,
        updated_at: new Date(),
      },
      { merge: true }
    );
    return true;
  } catch {
    return false;
  }
}
