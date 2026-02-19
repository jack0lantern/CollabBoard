import {
  ref,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
} from "firebase/database";
import { getRealtimeDb } from "./client";
import type { PresenceData } from "@/types/presence";

function presencePath(boardId: string, userId?: string): string {
  if (userId) return `boards/${boardId}/presence/${userId}`;
  return `boards/${boardId}/presence`;
}

export function setPresence(
  boardId: string,
  userId: string,
  presence: PresenceData
): Promise<void> {
  const db = getRealtimeDb();
  if (!db) return Promise.resolve();
  return set(ref(db, presencePath(boardId, userId)), presence);
}

export function updatePresenceCursor(
  boardId: string,
  userId: string,
  cursor: { x: number; y: number } | null
): void {
  const db = getRealtimeDb();
  if (!db) return;
  void update(ref(db, presencePath(boardId, userId)), {
    cursor,
    lastSeen: Date.now(),
  });
}

export function removePresence(
  boardId: string,
  userId: string
): Promise<void> {
  const db = getRealtimeDb();
  if (!db) return Promise.resolve();
  return remove(ref(db, presencePath(boardId, userId)));
}

export function onPresenceChange(
  boardId: string,
  callback: (presence: Record<string, PresenceData>) => void
): () => void {
  const db = getRealtimeDb();
  if (!db) return () => {};

  const presenceRef = ref(db, presencePath(boardId));
  return onValue(presenceRef, (snapshot) => {
    const val = snapshot.val() as Record<string, PresenceData> | null;
    callback(val ?? {});
  });
}

export function setupOnDisconnectCleanup(
  boardId: string,
  userId: string
): void {
  const db = getRealtimeDb();
  if (!db) return;
  void onDisconnect(ref(db, presencePath(boardId, userId))).remove();
}
