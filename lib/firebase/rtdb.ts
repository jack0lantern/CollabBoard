import {
  ref,
  set,
  update,
  remove,
  get,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onValue,
  onDisconnect,
  type Database,
  type Unsubscribe,
} from "firebase/database";
import { getDatabase } from "./client";
import type { ObjectData } from "@/types";
import type { PresenceData } from "@/types/presence";

function getDb(): Database | null {
  return getDatabase();
}

function boardObjectsPath(boardId: string) {
  return `boards/${boardId}/objects`;
}

function boardObjectPath(boardId: string, objectId: string) {
  return `boards/${boardId}/objects/${objectId}`;
}

function boardPresencePath(boardId: string) {
  return `boards/${boardId}/presence`;
}

function userPresencePath(boardId: string, userId: string) {
  return `boards/${boardId}/presence/${userId}`;
}

// --- Object operations ---

export function setBoardObject(
  boardId: string,
  object: ObjectData
): Promise<void> {
  const db = getDb();
  if (!db) return Promise.resolve();
  return set(ref(db, boardObjectPath(boardId, object.id)), object);
}

export function updateBoardObject(
  boardId: string,
  objectId: string,
  updates: Partial<ObjectData>
): Promise<void> {
  const db = getDb();
  if (!db) return Promise.resolve();
  return update(ref(db, boardObjectPath(boardId, objectId)), updates);
}

export function removeBoardObject(
  boardId: string,
  objectId: string
): Promise<void> {
  const db = getDb();
  if (!db) return Promise.resolve();
  return remove(ref(db, boardObjectPath(boardId, objectId)));
}

export async function getBoardObjects(
  boardId: string
): Promise<Record<string, ObjectData>> {
  const db = getDb();
  if (!db) return {};
  const snapshot = await get(ref(db, boardObjectsPath(boardId)));
  return (snapshot.val() as Record<string, ObjectData>) ?? {};
}

export async function seedBoardObjects(
  boardId: string,
  objects: Record<string, ObjectData>
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await set(ref(db, boardObjectsPath(boardId)), objects);
}

export function onBoardObjectsChange(
  boardId: string,
  callbacks: {
    onAdded: (id: string, data: ObjectData) => void;
    onChanged: (id: string, data: ObjectData) => void;
    onRemoved: (id: string) => void;
  }
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};

  const objectsRef = ref(db, boardObjectsPath(boardId));

  const unsubs: Unsubscribe[] = [
    onChildAdded(objectsRef, (snapshot) => {
      const data = snapshot.val() as ObjectData | null;
      if (data && snapshot.key) {
        callbacks.onAdded(snapshot.key, data);
      }
    }),
    onChildChanged(objectsRef, (snapshot) => {
      const data = snapshot.val() as ObjectData | null;
      if (data && snapshot.key) {
        callbacks.onChanged(snapshot.key, data);
      }
    }),
    onChildRemoved(objectsRef, (snapshot) => {
      if (snapshot.key) {
        callbacks.onRemoved(snapshot.key);
      }
    }),
  ];

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

// --- Presence operations ---

export function setPresence(
  boardId: string,
  userId: string,
  presence: PresenceData
): Promise<void> {
  const db = getDb();
  if (!db) return Promise.resolve();
  return set(ref(db, userPresencePath(boardId, userId)), presence);
}

export function updatePresenceCursor(
  boardId: string,
  userId: string,
  cursor: { x: number; y: number } | null
): Promise<void> {
  const db = getDb();
  if (!db) return Promise.resolve();
  return update(ref(db, userPresencePath(boardId, userId)), {
    cursor,
    lastSeen: Date.now(),
  });
}

export function removePresence(
  boardId: string,
  userId: string
): Promise<void> {
  const db = getDb();
  if (!db) return Promise.resolve();
  return remove(ref(db, userPresencePath(boardId, userId)));
}

export function onPresenceChange(
  boardId: string,
  callback: (presence: Record<string, PresenceData>) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};

  const presenceRef = ref(db, boardPresencePath(boardId));
  return onValue(presenceRef, (snapshot) => {
    const val = (snapshot.val() as Record<string, PresenceData>) ?? {};
    callback(val);
  });
}

export function setupOnDisconnectCleanup(
  boardId: string,
  userId: string
): void {
  const db = getDb();
  if (!db) return;
  onDisconnect(ref(db, userPresencePath(boardId, userId))).remove();
}
