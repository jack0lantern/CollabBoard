"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  onPresenceChange,
  setPresence,
  updatePresenceCursor,
  removePresence,
  setupOnDisconnectCleanup,
} from "@/lib/firebase/presence";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";

const STALE_THRESHOLD_MS = 30000;
const CURSOR_DEBOUNCE_MS = 50;

export interface OtherUser {
  userId: string;
  cursor: { x: number; y: number } | null;
  displayName: string;
  avatarUrl: string | null;
}

export function usePresence() {
  const { boardId, userId, displayName, avatarUrl, readOnly } = useBoardContext();
  const [others, setOthers] = useState<OtherUser[]>([]);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!boardId || !userId || readOnly) return;

    setPresence(boardId, userId, {
      cursor: null,
      displayName: displayName ?? "Anonymous",
      avatarUrl: avatarUrl ?? null,
      lastSeen: Date.now(),
    });

    setupOnDisconnectCleanup(boardId, userId);

    const unsubscribe = onPresenceChange(boardId, (presenceMap) => {
      const now = Date.now();
      const otherUsers: OtherUser[] = [];

      for (const [uid, data] of Object.entries(presenceMap)) {
        if (uid === userId) continue;
        if (now - data.lastSeen > STALE_THRESHOLD_MS) continue;

        otherUsers.push({
          userId: uid,
          cursor: data.cursor,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        });
      }

      setOthers(otherUsers);
    });

    const heartbeat = setInterval(() => {
      setPresence(boardId, userId, {
        cursor: null,
        displayName: displayName ?? "Anonymous",
        avatarUrl: avatarUrl ?? null,
        lastSeen: Date.now(),
      });
    }, 10000);

    return () => {
      clearInterval(heartbeat);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      unsubscribe();
      removePresence(boardId, userId);
    };
  }, [boardId, userId, displayName, avatarUrl, readOnly]);

  const updateCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!boardId || !userId || readOnly) return;

      if (cursor === null) {
        if (cursorTimerRef.current) {
          clearTimeout(cursorTimerRef.current);
          cursorTimerRef.current = null;
        }
        pendingCursorRef.current = null;
        updatePresenceCursor(boardId, userId, null);
        return;
      }

      pendingCursorRef.current = cursor;
      if (cursorTimerRef.current === null) {
        cursorTimerRef.current = setTimeout(() => {
          cursorTimerRef.current = null;
          if (pendingCursorRef.current) {
            updatePresenceCursor(boardId, userId, pendingCursorRef.current);
          }
        }, CURSOR_DEBOUNCE_MS);
      }
    },
    [boardId, userId, readOnly]
  );

  return { others, updateCursor };
}
