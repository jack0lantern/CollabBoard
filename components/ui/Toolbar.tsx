"use client";

import { useBoardMutations } from "@/hooks/useBoardMutations";
import { useBoardObjects } from "@/hooks/useBoardObjects";
import { useCallback } from "react";
import type { ObjectData } from "@/types";

const COLORS = ["#fef08a", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

function getNextZIndex(objects: Record<string, ObjectData>): number {
  const values = Object.values(objects).filter(
    (o): o is ObjectData =>
      o != null && typeof o === "object" && "id" in o && "type" in o
  );
  const max = Math.max(0, ...values.map((o) => o.zIndex ?? 0));
  return max + 1;
}

export function Toolbar() {
  const { addObject } = useBoardMutations();
  const objects = useBoardObjects();

  const addSticky = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "sticky",
      x: 100,
      y: 100,
      zIndex: getNextZIndex(objects),
      width: 200,
      height: 150,
      color: COLORS[0],
      text: "New note",
    });
  }, [addObject, objects]);

  const addRect = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "rect",
      x: 150,
      y: 150,
      zIndex: getNextZIndex(objects),
      width: 100,
      height: 80,
      color: COLORS[1],
    });
  }, [addObject, objects]);

  const addCircle = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "circle",
      x: 200,
      y: 200,
      zIndex: getNextZIndex(objects),
      radius: 50,
      color: COLORS[2],
    });
  }, [addObject, objects]);

  return (
    <div className="flex gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <button
        onClick={addSticky}
        className="px-3 py-2 rounded bg-yellow-200 dark:bg-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-700 text-sm font-medium"
      >
        Sticky
      </button>
      <button
        onClick={addRect}
        className="px-3 py-2 rounded bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-blue-700 text-sm font-medium"
      >
        Rect
      </button>
      <button
        onClick={addCircle}
        className="px-3 py-2 rounded bg-green-200 dark:bg-green-800 hover:bg-green-300 dark:hover:bg-green-700 text-sm font-medium"
      >
        Circle
      </button>
    </div>
  );
}
