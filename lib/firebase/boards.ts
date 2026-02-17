import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "./client";
import type { Board, ObjectData, ShareRole } from "@/types";

const BOARDS_COLLECTION = "boards";

function docToBoard(docId: string, data: Record<string, unknown> | undefined): Board {
  return {
    id: docId,
    title: (data?.title as string) ?? "",
    created_at: (data?.created_at as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ?? "",
    owner_id: (data?.owner_id as string) ?? null,
    last_snapshot: (data?.last_snapshot as Record<string, ObjectData>) ?? null,
    is_public: (data?.is_public as boolean) ?? false,
    shared_with: (data?.shared_with as Record<string, ShareRole>) ?? {},
  };
}

export async function getBoard(id: string): Promise<Board | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const docRef = doc(db, BOARDS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return docToBoard(snapshot.id, snapshot.data());
  } catch {
    return null;
  }
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

export async function updateBoardSharing(
  boardId: string,
  updates: { is_public?: boolean; shared_with?: Record<string, ShareRole> }
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    const updateData: Record<string, unknown> = {};
    if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
    if (updates.shared_with !== undefined) updateData.shared_with = updates.shared_with;
    if (Object.keys(updateData).length > 0) {
      await updateDoc(docRef, updateData);
    }
    return true;
  } catch {
    return false;
  }
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

// --- Canvas objects (subcollection) ---

export function setBoardObject(
  boardId: string,
  object: ObjectData
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return Promise.resolve();
  return setDoc(
    doc(db, BOARDS_COLLECTION, boardId, "objects", object.id),
    object
  );
}

export function updateBoardObject(
  boardId: string,
  objectId: string,
  updates: Partial<ObjectData>
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return Promise.resolve();
  return updateDoc(
    doc(db, BOARDS_COLLECTION, boardId, "objects", objectId),
    updates as Record<string, unknown>
  );
}

export function removeBoardObject(
  boardId: string,
  objectId: string
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return Promise.resolve();
  return deleteDoc(doc(db, BOARDS_COLLECTION, boardId, "objects", objectId));
}

export async function getBoardObjects(
  boardId: string
): Promise<Record<string, ObjectData>> {
  const db = getFirestoreDb();
  if (!db) return {};
  const snapshot = await getDocs(
    collection(db, BOARDS_COLLECTION, boardId, "objects")
  );
  const out: Record<string, ObjectData> = {};
  snapshot.docs.forEach((d) => {
    out[d.id] = d.data() as ObjectData;
  });
  return out;
}

export async function seedBoardObjects(
  boardId: string,
  objects: Record<string, ObjectData>
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  const batch = Object.entries(objects);
  await Promise.all(
    batch.map(([id, obj]) =>
      setDoc(doc(db, BOARDS_COLLECTION, boardId, "objects", id), obj)
    )
  );
}

export function onBoardObjectsChange(
  boardId: string,
  callbacks: {
    onAdded: (id: string, data: ObjectData) => void;
    onChanged: (id: string, data: ObjectData) => void;
    onRemoved: (id: string) => void;
  }
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) return () => {};

  const objectsRef = collection(db, BOARDS_COLLECTION, boardId, "objects");
  return onSnapshot(objectsRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const id = change.doc.id;
      const data = change.doc.data() as ObjectData;
      if (change.type === "added") callbacks.onAdded(id, data);
      else if (change.type === "modified") callbacks.onChanged(id, data);
      else if (change.type === "removed") callbacks.onRemoved(id);
    });
  });
}

// Presence functions have been moved to lib/firebase/presence.ts (RTDB-backed).
