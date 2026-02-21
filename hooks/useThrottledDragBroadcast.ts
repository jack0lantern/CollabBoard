"use client";

import { useCallback, useRef, useEffect } from "react";
import { broadcastDragMove, type DragMovePositions } from "@/lib/supabase/boards";

const BROADCAST_THROTTLE_MS = 60; // ~16fps for remote drag visibility

/**
 * Returns a throttled function to broadcast ephemeral drag positions during multi-select
 * or single-shape drag. Throttles to ~60ms to avoid flooding the Realtime channel.
 */
export function useThrottledDragBroadcast(boardId: string) {
  const pendingRef = useRef<DragMovePositions>({});
  const lastBroadcastRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timeoutRef.current = null;
    const pending = pendingRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingRef.current = {};
    lastBroadcastRef.current = Date.now();
    broadcastDragMove(boardId, pending);
  }, [boardId]);

  const broadcast = useCallback(
    (positions: DragMovePositions) => {
      if (Object.keys(positions).length === 0) return;
      Object.assign(pendingRef.current, positions);

      const now = Date.now();
      const elapsed = now - lastBroadcastRef.current;

      if (elapsed >= BROADCAST_THROTTLE_MS) {
        flush();
      } else if (timeoutRef.current == null) {
        timeoutRef.current = setTimeout(flush, BROADCAST_THROTTLE_MS - elapsed);
      }
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return broadcast;
}
