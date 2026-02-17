"use client";

import { useEffect, useState, useCallback } from "react";
import {
  onPresenceChange,
  setPresence,
  updatePresenceCursor,
  removePresence,
  setupOnDisconnectCleanup,
} from "@/lib/firebase/boards";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";
import type { PresenceData } from "@/types/presence";

const STALE_THRESHOLD_MS = 30000;

export interface OtherUser {
  userId: string;
  cursor: { x: number; y: number } | null;
  displayName: string;
  avatarUrl: string | null;
}

export function usePresence() {
  const { boardId, userId, displayName, avatarUrl } = useBoardContext();
  const [others, setOthers] = useState<OtherUser[]>([]);

  // Set own presence and subscribe to others
  useEffect(() => {
    if (!boardId || !userId) return;

    // Publish own presence
    setPresence(boardId, userId, {
      cursor: null,
      displayName: displayName ?? "Anonymous",
      avatarUrl: avatarUrl ?? null,
      lastSeen: Date.now(),
    });

    // Set up disconnect cleanup
    setupOnDisconnectCleanup(boardId, userId);

    // Subscribe to all presence
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

    // Heartbeat: update lastSeen every 10s
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
      unsubscribe();
      removePresence(boardId, userId);
    };
  }, [boardId, userId, displayName, avatarUrl]);

  const updateCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!boardId || !userId) return;
      updatePresenceCursor(boardId, userId, cursor);
    },
    [boardId, userId]
  );

  return { others, updateCursor };
}
