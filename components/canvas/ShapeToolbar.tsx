"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { ObjectData, ShapeType } from "@/types";

function useDebouncedUpdate(
  onUpdate: (updates: Partial<ObjectData>) => void,
  delay: number
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<ObjectData>>({});

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (Object.keys(pendingRef.current).length > 0) {
      onUpdate(pendingRef.current);
      pendingRef.current = {};
    }
  }, [onUpdate]);

  const debouncedUpdate = useCallback(
    (updates: Partial<ObjectData>) => {
      pendingRef.current = { ...pendingRef.current, ...updates };
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, delay);
    },
    [delay, flush]
  );

  useEffect(
    () => () => {
      flush();
    },
    [flush]
  );

  return debouncedUpdate;
}


const FONT_FAMILIES = [
  "Inter",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "system-ui",
  "sans-serif",
];

const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 120;

const STROKE_WIDTHS = [0, 1, 2, 3, 4, 6, 8];

const SHAPES_WITH_TEXT: ShapeType[] = ["sticky", "text"];
const SHAPES_WITH_FILL: ShapeType[] = ["sticky", "rect", "circle", "frame"];
const SHAPES_WITH_STROKE: ShapeType[] = ["sticky", "rect", "circle", "line", "frame"];

function hasText(type: ShapeType): boolean {
  return SHAPES_WITH_TEXT.includes(type);
}

function hasFill(type: ShapeType): boolean {
  return SHAPES_WITH_FILL.includes(type);
}

function hasStroke(type: ShapeType): boolean {
  return SHAPES_WITH_STROKE.includes(type);
}

export interface ShapeToolbarProps {
  object: ObjectData;
  containerRect: DOMRect;
  /** Bounding box of the shape in container-relative coordinates (stage coords) */
  shapeRect: { x: number; y: number; width: number; height: number };
  onUpdate: (updates: Partial<ObjectData>) => void;
  onClose?: () => void;
}

export function ShapeToolbar({
  object,
  containerRect,
  shapeRect,
  onUpdate,
  onClose,
}: ShapeToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const debouncedUpdate = useDebouncedUpdate(onUpdate, 150);
  const [fontSizeInput, setFontSizeInput] = useState<string | null>(null);

  const TOOLBAR_GAP = 56;
  const TOOLBAR_PADDING = 4;
  const TOOLBAR_MIN_HEIGHT = 44;
  const TOOLBAR_EST_WIDTH = 420;

  // Position above or below based on available space
  const spaceAbove = shapeRect.y;
  const spaceBelow = containerRect.height - (shapeRect.y + shapeRect.height);
  const showAbove = spaceAbove >= spaceBelow;

  const toolbarHeight = TOOLBAR_MIN_HEIGHT + TOOLBAR_PADDING * 2;
  const yOffset = showAbove
    ? -(toolbarHeight + TOOLBAR_GAP)
    : shapeRect.height + TOOLBAR_GAP;

  const centerX = containerRect.left + shapeRect.x + shapeRect.width / 2;
  const left = Math.max(
    containerRect.left + TOOLBAR_EST_WIDTH / 2,
    Math.min(centerX, containerRect.right - TOOLBAR_EST_WIDTH / 2)
  );
  const top = Math.max(
    containerRect.top + 8,
    Math.min(
      containerRect.top + shapeRect.y + yOffset,
      containerRect.bottom - toolbarHeight - 8
    )
  );

  useEffect(() => {
    if (!onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setFontSizeInput(null);
  }, [object.id]);

  const showFontControls = hasText(object.type);
  const showFillControl = hasFill(object.type);
  const showStrokeControl = hasStroke(object.type);

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Shape formatting"
      className="fixed z-50 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      style={{
        left,
        top,
        transform: "translateX(-50%)",
      }}
    >
      {showFontControls && (
        <>
          <select
            value={object.fontFamily ?? "sans-serif"}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className="h-8 rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            title="Font family"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            value={fontSizeInput ?? object.fontSize ?? 14}
            onFocus={() => setFontSizeInput(String(object.fontSize ?? 14))}
            onChange={(e) => {
              const raw = e.target.value;
              setFontSizeInput(raw);
              const v = Number(raw);
              if (!Number.isNaN(v) && v >= FONT_SIZE_MIN && v <= FONT_SIZE_MAX) {
                onUpdate({ fontSize: v });
              }
            }}
            onBlur={() => {
              const v = Number(fontSizeInput ?? object.fontSize ?? 14);
              const clamped = Math.min(
                FONT_SIZE_MAX,
                Math.max(
                  FONT_SIZE_MIN,
                  Number.isNaN(v) ? (object.fontSize ?? 14) : v
                )
              );
              onUpdate({ fontSize: clamped });
              setFontSizeInput(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-8 w-14 rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            title="Font size"
          />
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => {
                onUpdate({
                  fontWeight: object.fontWeight === "bold" ? "normal" : "bold",
                });
              }}
              className={`h-8 w-8 rounded px-1 text-sm font-bold ${
                object.fontWeight === "bold"
                  ? "bg-gray-200 dark:bg-gray-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({
                  fontStyle: object.fontStyle === "italic" ? "normal" : "italic",
                });
              }}
              className={`h-8 w-8 rounded px-1 text-sm italic ${
                object.fontStyle === "italic"
                  ? "bg-gray-200 dark:bg-gray-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate({
                  textDecoration:
                    object.textDecoration === "underline" ? "none" : "underline",
                });
              }}
              className={`h-8 w-8 rounded px-1 text-sm underline ${
                object.textDecoration === "underline"
                  ? "bg-gray-200 dark:bg-gray-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Underline"
            >
              U
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Text
            </span>
            <input
              type="color"
              value={object.textColor ?? "#000000"}
              onChange={(e) => debouncedUpdate({ textColor: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              title="Text color"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Highlight
            </span>
            <input
              type="color"
              value={object.textHighlightColor ?? "#fef08a"}
              onChange={(e) => {
                debouncedUpdate({ textHighlightColor: e.target.value });
              }}
              className="h-8 w-8 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              title="Highlight color"
            />
            {object.textHighlightColor != null &&
              object.textHighlightColor !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ textHighlightColor: undefined });
                  }}
                  className="h-8 px-2 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Remove highlight"
                >
                  Clear
                </button>
              )}
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />
        </>
      )}

      {object.type === "frame" && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Title
            </span>
            <input
              type="text"
              value={object.title ?? ""}
              onChange={(e) => debouncedUpdate({ title: e.target.value })}
              placeholder="Frame title"
              className="h-8 min-w-[120px] rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              title="Frame title"
            />
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />
        </>
      )}

      {showFillControl && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Fill
            </span>
            <input
              type="color"
              value={
                (object.type === "frame" ? object.frameColor : object.color) ??
                (object.type === "sticky"
                  ? "#fef08a"
                  : object.type === "rect"
                    ? "#3b82f6"
                    : object.type === "frame"
                      ? "#ffffff"
                      : "#10b981")
              }
              onChange={(e) => {
                debouncedUpdate(
                  object.type === "frame"
                    ? { frameColor: e.target.value }
                    : { color: e.target.value }
                );
              }}
              className="h-8 w-8 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              title="Fill color"
            />
          </div>
          {(showFontControls || showStrokeControl) && (
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />
          )}
        </>
      )}

      {showStrokeControl && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Border
            </span>
            <input
              type="color"
              value={object.strokeColor ?? object.color ?? "#6b7280"}
              onChange={(e) => {
                debouncedUpdate({ strokeColor: e.target.value });
              }}
              className="h-8 w-8 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              title="Border color"
            />
          </div>
          <select
            value={object.strokeWidth ?? 0}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
            className="h-8 w-14 rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            title="Border width"
          >
            {STROKE_WIDTHS.map((w) => (
              <option key={w} value={w}>
                {w === 0 ? "None" : `${String(w)}px`}
              </option>
            ))}
          </select>
          {object.type === "line" && (
            <>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />
              <button
                type="button"
                onClick={() => {
                  const hasArrow = object.arrowStart ?? object.arrowEnd;
                  onUpdate({
                    arrowStart: undefined,
                    arrowEnd: hasArrow ? undefined : true,
                  });
                }}
                className={`h-8 px-2 rounded text-sm ${
                  (object.arrowStart ?? object.arrowEnd) ?? false
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Toggle arrow"
              >
                →
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
