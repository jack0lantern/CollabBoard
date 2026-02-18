"use client";

import { useBoardMutations } from "@/hooks/useBoardMutations";
import { useBoardObjectsContext } from "@/hooks/useBoardObjects";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

function ShapesIcon() {
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
      <rect x="3" y="3" width="10" height="10" rx="1" />
      <circle cx="16" cy="16" r="6" />
    </svg>
  );
}

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

function LineIcon() {
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
      <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
  );
}

export function Toolbar() {
  const { addObject } = useBoardMutations();
  const { objects } = useBoardObjectsContext();
  const [shapesExpanded, setShapesExpanded] = useState(false);
  const shapesRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        shapesRef.current != null &&
        !shapesRef.current.contains(target) &&
        !document.getElementById("toolbar-shapes-dropdown")?.contains(target)
      ) {
        setShapesExpanded(false);
        setDropdownPosition(null);
      }
    };
    if (shapesExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shapesExpanded]);

  const handleShapesClick = useCallback(() => {
    setShapesExpanded((prev) => {
      if (prev) {
        setDropdownPosition(null);
        return false;
      }
      if (buttonRef.current != null) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({ top: rect.top, left: rect.right + 4 });
      }
      return true;
    });
  }, []);

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
    setShapesExpanded(false);
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
    setShapesExpanded(false);
  }, [addObject, objects]);

  const addLine = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "line",
      x: 150,
      y: 150,
      zIndex: getNextZIndex(objects),
      points: [0, 0, 100, 80],
      color: COLORS[3],
    });
    setShapesExpanded(false);
  }, [addObject, objects]);

  return (
    <aside className="flex flex-col gap-1 p-2 w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm">
      <button
        onClick={addSticky}
        aria-label="Add sticky note"
        className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
      >
        <StickyIcon />
      </button>
      <div ref={shapesRef} className="relative">
        <button
          ref={buttonRef}
          onClick={handleShapesClick}
          aria-label="Add shapes"
          aria-expanded={shapesExpanded}
          aria-haspopup="true"
          className={`p-2 rounded-md transition-colors ${
            shapesExpanded
              ? "bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
              : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          }`}
        >
          <ShapesIcon />
        </button>
        {shapesExpanded &&
          dropdownPosition != null &&
          createPortal(
            <div
              id="toolbar-shapes-dropdown"
              className="fixed flex flex-col gap-1 min-w-[2.5rem] py-1 px-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
              }}
            >
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
              <button
                onClick={addLine}
                aria-label="Add line"
                className="p-2 rounded-md bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700 text-red-900 dark:text-red-100 transition-colors"
              >
                <LineIcon />
              </button>
            </div>,
            document.body
          )}
      </div>
    </aside>
  );
}
