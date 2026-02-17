import { getDb } from "@/lib/firebase/admin";
import type { Board } from "@/types";

const BOARDS_COLLECTION = "boards";

export async function getBoard(id: string): Promise<Board | null> {
  const db = getDb();
  if (!db) return null;

  const doc = await db.collection(BOARDS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data();
  return {
    id: doc.id,
    title: data?.title ?? "",
    created_at: data?.created_at?.toDate?.()?.toISOString?.() ?? "",
    owner_id: data?.owner_id ?? null,
    last_snapshot: data?.last_snapshot ?? null,
  } as Board;
}

export async function getBoardsByOwner(ownerId: string): Promise<Board[]> {
  const db = getDb();
  if (!db) return [];

  const snapshot = await db
    .collection(BOARDS_COLLECTION)
    .where("owner_id", "==", ownerId)
    .orderBy("created_at", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data?.title ?? "",
      created_at: data?.created_at?.toDate?.()?.toISOString?.() ?? "",
      owner_id: data?.owner_id ?? null,
      last_snapshot: data?.last_snapshot ?? null,
    } as Board;
  });
}

export async function createBoard(
  title: string,
  ownerId: string
): Promise<Board | null> {
  const db = getDb();
  if (!db) return null;

  const ref = await db.collection(BOARDS_COLLECTION).add({
    title,
    owner_id: ownerId,
    created_at: new Date(),
    last_snapshot: null,
  });

  const doc = await ref.get();
  const data = doc.data();
  return {
    id: doc.id,
    title: data?.title ?? "",
    created_at: data?.created_at?.toDate?.()?.toISOString?.() ?? "",
    owner_id: data?.owner_id ?? null,
    last_snapshot: data?.last_snapshot ?? null,
  } as Board;
}

export async function updateBoardSnapshot(
  id: string,
  snapshot: Record<string, unknown>
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    await db.collection(BOARDS_COLLECTION).doc(id).update({
      last_snapshot: snapshot,
    });
    return true;
  } catch {
    return false;
  }
}
