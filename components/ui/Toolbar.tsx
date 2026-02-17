"use client";

import { useBoardMutations } from "@/hooks/useBoardMutations";
import { useCallback } from "react";

const COLORS = ["#fef08a", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

export function Toolbar() {
  const { addObject } = useBoardMutations();

  const addSticky = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "sticky",
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      color: COLORS[0],
      text: "New note",
    });
  }, [addObject]);

  const addRect = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "rect",
      x: 150,
      y: 150,
      width: 100,
      height: 80,
      color: COLORS[1],
    });
  }, [addObject]);

  const addCircle = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "circle",
      x: 200,
      y: 200,
      radius: 50,
      color: COLORS[2],
    });
  }, [addObject]);

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
