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

const iconClass = "w-5 h-5";

function StickyIcon() {
  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M16 3v5h5" />
    </svg>
  );
}

function RectIcon() {
  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
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
    <aside className="flex flex-col gap-1 p-2 w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm">
      <button
        onClick={addSticky}
        aria-label="Add sticky note"
        className="p-2 rounded-md bg-yellow-200 dark:bg-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-100 transition-colors"
      >
        <StickyIcon />
      </button>
      <button
        onClick={addRect}
        aria-label="Add rectangle"
        className="p-2 rounded-md bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-blue-700 text-blue-900 dark:text-blue-100 transition-colors"
      >
        <RectIcon />
      </button>
      <button
        onClick={addCircle}
        aria-label="Add circle"
        className="p-2 rounded-md bg-green-200 dark:bg-green-800 hover:bg-green-300 dark:hover:bg-green-700 text-green-900 dark:text-green-100 transition-colors"
      >
        <CircleIcon />
      </button>
    </aside>
  );
}
