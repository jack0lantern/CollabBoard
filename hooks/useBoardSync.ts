"use client";

import { useEffect, useRef } from "react";
import { useBoardState } from "@/lib/liveblocks/hooks";
import { debounce } from "@/lib/utils/debounce";

export function useBoardSync(boardId: string) {
  const objects = useBoardState();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!objects || !boardId) return;

    const syncToPostgres = debounce(async () => {
      const snapshot = { ...objects };
      await fetch(`/api/boards/${boardId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      hasSyncedRef.current = true;
    }, 30000);

    syncToPostgres();

    return () => {
      syncToPostgres();
    };
  }, [objects, boardId]);
}
