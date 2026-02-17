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
import type { Board, ObjectData } from "@/types";
import type { PresenceData } from "@/types/presence";

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

// --- Presence (subcollection) ---

export function setPresence(
  boardId: string,
  userId: string,
  presence: PresenceData
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return Promise.resolve();
  return setDoc(
    doc(db, BOARDS_COLLECTION, boardId, "presence", userId),
    presence
  );
}

export function updatePresenceCursor(
  boardId: string,
  userId: string,
  cursor: { x: number; y: number } | null
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return Promise.resolve();
  return updateDoc(
    doc(db, BOARDS_COLLECTION, boardId, "presence", userId),
    { cursor, lastSeen: Date.now() }
  );
}

export function removePresence(
  boardId: string,
  userId: string
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return Promise.resolve();
  return deleteDoc(doc(db, BOARDS_COLLECTION, boardId, "presence", userId));
}

export function onPresenceChange(
  boardId: string,
  callback: (presence: Record<string, PresenceData>) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) return () => {};

  const presenceRef = collection(db, BOARDS_COLLECTION, boardId, "presence");
  return onSnapshot(presenceRef, (snapshot) => {
    const out: Record<string, PresenceData> = {};
    snapshot.docs.forEach((d) => {
      out[d.id] = d.data() as PresenceData;
    });
    callback(out);
  });
}

export function setupOnDisconnectCleanup(
  _boardId: string,
  _userId: string
): void {
  // Firestore has no onDisconnect; rely on lastSeen + stale filtering.
}
