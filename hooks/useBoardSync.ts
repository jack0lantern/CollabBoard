"use client";

import { useEffect, useRef, useCallback } from "react";
import { getBoardObjects } from "@/lib/firebase/rtdb";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";

export function useBoardSync() {
  const { boardId } = useBoardContext();
  const dirtyRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncToFirestore = useCallback(async () => {
    if (!boardId) return;
    const objects = await getBoardObjects(boardId);
    await fetch(`/api/boards/${boardId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot: objects }),
    });
    dirtyRef.current = false;
  }, [boardId]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const flushSync = useCallback(async () => {
    if (dirtyRef.current) {
      await syncToFirestore();
    }
  }, [syncToFirestore]);

  useEffect(() => {
    if (!boardId) return;

    intervalRef.current = setInterval(() => {
      if (dirtyRef.current) {
        syncToFirestore();
      }
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Flush on unmount
      if (dirtyRef.current) {
        syncToFirestore();
      }
    };
  }, [boardId, syncToFirestore]);

  return { markDirty, flushSync };
}
