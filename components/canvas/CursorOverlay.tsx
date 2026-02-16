"use client";

import { useOthers } from "@/lib/liveblocks/client";
import { useCallback, useEffect } from "react";
import type Konva from "konva";

export function CursorOverlay({
  stageRef,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const others = useOthers();

  const updateCursors = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    others.forEach((user) => {
      const cursor = user.presence?.cursor;
      if (!cursor || typeof cursor !== "object" || !("x" in cursor) || !("y" in cursor))
        return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const point = transform.point({
        x: (cursor as { x: number; y: number }).x,
        y: (cursor as { x: number; y: number }).y,
      });
      // Cursors would be rendered here - for MVP we rely on Liveblocks' default
      // or a custom cursor component. This is a placeholder for the logic.
    });
  }, [others, stageRef]);

  useEffect(() => {
    updateCursors();
  }, [others, updateCursors]);

  return null;
}
