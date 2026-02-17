import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "./client";
import type { Board, ObjectData } from "@/types";

const BOARDS_COLLECTION = "boards";

function docToBoard(docId: string, data: Record<string, unknown> | undefined): Board {
  return {
    id: docId,
    title: (data?.title as string) ?? "",
    created_at: (data?.created_at as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? "",
    owner_id: (data?.owner_id as string) ?? null,
    last_snapshot: (data?.last_snapshot as Record<string, ObjectData>) ?? null,
  };
}

export async function getBoard(id: string): Promise<Board | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const docRef = doc(db, BOARDS_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;

  return docToBoard(snapshot.id, snapshot.data());
}

export async function getBoardsByOwner(ownerId: string): Promise<Board[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  const q = query(
    collection(db, BOARDS_COLLECTION),
    where("owner_id", "==", ownerId),
    orderBy("created_at", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToBoard(d.id, d.data()));
}

export async function createBoard(
  title: string,
  ownerId: string
): Promise<Board | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const ref = await addDoc(collection(db, BOARDS_COLLECTION), {
    title,
    owner_id: ownerId,
    created_at: new Date(),
    last_snapshot: null,
  });

  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return docToBoard(snapshot.id, snapshot.data());
}

export async function updateBoardSnapshot(
  id: string,
  snapshot: Record<string, unknown>
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    await updateDoc(doc(db, BOARDS_COLLECTION, id), {
      last_snapshot: snapshot,
    });
    return true;
  } catch {
    return false;
  }
}

export function subscribeToBoardsByOwner(
  ownerId: string,
  callback: (boards: Board[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) return () => {};

  const q = query(
    collection(db, BOARDS_COLLECTION),
    where("owner_id", "==", ownerId),
    orderBy("created_at", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const boards = snapshot.docs.map((d) => docToBoard(d.id, d.data()));
    callback(boards);
  });
}
