"use client";

import { useBoardMutations } from "@/hooks/useBoardMutations";
import { useBoardObjectsContext } from "@/hooks/useBoardObjects";
import { useTool } from "@/components/providers/ToolProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ObjectData } from "@/types";

const COLORS = ["#fef08a", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

function getNextZIndex(objects: Record<string, ObjectData>): number {
  const values = Object.values(objects).filter(
    (o): o is ObjectData =>
      typeof o === "object" && "id" in o && "type" in o
  );
  const max = Math.max(0, ...values.map((o) => o.zIndex ?? 0));
  return max + 1;
}

const iconClass = "w-5 h-5";

function ShapesIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="10" height="10" rx="1" />
      <circle cx="16" cy="16" r="6" />
    </svg>
  );
}

function StickyIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M16 3v5h5" />
    </svg>
  );
}

function RectIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l9 10-9 10-9-10 9-10z" />
    </svg>
  );
}

function TriangleIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 22h20L12 2z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19L17 7" />
      <polygon points="19,5 16,6 18,8" fill="currentColor" />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <line x1="2" y1="8" x2="22" y2="8" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    </svg>
  );
}

const PEN_STROKE_WIDTHS = [1, 2, 4, 6, 8];

export function Toolbar() {
  const { addObject } = useBoardMutations();
  const { objects } = useBoardObjectsContext();
  const {
    activeTool,
    setActiveTool,
    penColor,
    penStrokeWidth,
    setPenColor,
    setPenStrokeWidth,
  } = useTool();
  const [shapesExpanded, setShapesExpanded] = useState(false);
  const shapesRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const penButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [penToolbarPosition, setPenToolbarPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (activeTool === "pen" && penButtonRef.current) {
      const rect = penButtonRef.current.getBoundingClientRect();
      setPenToolbarPosition({ top: rect.top, left: rect.right + 6 });
    } else if (activeTool !== "pen") {
      setPenToolbarPosition(null);
    }
  }, [activeTool]);

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
        setDropdownPosition({ top: rect.top, left: rect.right + 6 });
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

  const addDiamond = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "diamond",
      x: 175,
      y: 175,
      zIndex: getNextZIndex(objects),
      width: 100,
      height: 80,
      color: COLORS[4],
    });
    setShapesExpanded(false);
  }, [addObject, objects]);

  const addTriangle = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "triangle",
      x: 175,
      y: 175,
      zIndex: getNextZIndex(objects),
      width: 100,
      height: 80,
      color: COLORS[3],
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

  const addArrow = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "line",
      x: 150,
      y: 150,
      zIndex: getNextZIndex(objects),
      points: [0, 0, 100, 80],
      color: COLORS[3],
      arrowEnd: true,
    });
    setShapesExpanded(false);
  }, [addObject, objects]);

  const addFrame = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "frame",
      x: 100,
      y: 100,
      zIndex: getNextZIndex(objects),
      width: 600,
      height: 400,
      frameColor: "#ffffff",
      strokeColor: "#e5e7eb",
      strokeWidth: 1,
    });
  }, [addObject, objects]);

  const addText = useCallback(() => {
    addObject({
      id: crypto.randomUUID(),
      type: "text",
      x: 100,
      y: 100,
      zIndex: getNextZIndex(objects),
      width: 200,
      height: 32,
      text: "Text",
      fontSize: 16,
      fontFamily: "sans-serif",
      textColor: "#000000",
    });
  }, [addObject, objects]);

  return (
    <aside
      className="flex flex-col gap-2 p-2 w-14 bg-white"
      style={{
        borderRight: "3px solid #1a1a2e",
        boxShadow: "2px 0 0 #1a1a2e",
      }}
    >
      {/* Sticky note – yellow */}
      <button
        onClick={addSticky}
        aria-label="Add sticky note"
        className="crayon-icon-btn crayon-icon-yellow"
        title="Sticky note"
      >
        <StickyIcon />
      </button>

      {/* Frame – orange */}
      <button
        onClick={addFrame}
        aria-label="Add frame"
        className="crayon-icon-btn crayon-icon-orange"
        title="Frame"
      >
        <FrameIcon />
      </button>

      {/* Text – purple */}
      <button
        onClick={addText}
        aria-label="Add text"
        className="crayon-icon-btn crayon-icon-purple"
        title="Text"
      >
        <TextIcon />
      </button>

      {/* Pen – freedrawing */}
      <div className="relative">
        <button
          ref={penButtonRef}
          onClick={() => setActiveTool(activeTool === "pen" ? "select" : "pen")}
          aria-label="Pen tool"
          aria-pressed={activeTool === "pen"}
          aria-expanded={activeTool === "pen"}
          aria-haspopup="true"
          className={`crayon-icon-btn ${activeTool === "pen" ? "crayon-icon-green" : "crayon-icon-green opacity-80"}`}
          title="Pen (draw)"
        >
          <PenIcon />
        </button>

        {activeTool === "pen" &&
          penToolbarPosition != null &&
          createPortal(
            <div
              id="toolbar-pen-dropdown"
              className="fixed flex flex-col gap-2 py-2 px-2 bg-white rounded-2xl z-50"
              style={{
                top: penToolbarPosition.top,
                left: penToolbarPosition.left,
                border: "3px solid #1a1a2e",
                boxShadow: "4px 4px 0 #1a1a2e",
                filter: "url(#hand-drawn)",
              }}
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold px-1" style={{ color: "var(--foreground)" }}>
                  Color
                </span>
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-xl border-2 border-[#1a1a2e]"
                  style={{ boxShadow: "2px 2px 0 #1a1a2e" }}
                  title="Pen color"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold px-1" style={{ color: "var(--foreground)" }}>
                  Size
                </span>
                <select
                  value={penStrokeWidth}
                  onChange={(e) => setPenStrokeWidth(Number(e.target.value))}
                  className="crayon-input h-8 w-20 px-2 text-sm py-1"
                  title="Pen size"
                >
                  {PEN_STROKE_WIDTHS.map((w) => (
                    <option key={w} value={w}>
                      {w}px
                    </option>
                  ))}
                </select>
              </div>
            </div>,
            document.body
          )}
      </div>

      {/* Shapes – blue, expandable */}
      <div ref={shapesRef} className="relative">
        <button
          ref={buttonRef}
          onClick={handleShapesClick}
          aria-label="Add shapes"
          aria-expanded={shapesExpanded}
          aria-haspopup="true"
          className={`crayon-icon-btn ${
            shapesExpanded ? "crayon-icon-blue" : "crayon-icon-blue opacity-80"
          }`}
          title="Shapes"
        >
          <ShapesIcon />
        </button>

        {shapesExpanded &&
          dropdownPosition != null &&
          createPortal(
            <div
              id="toolbar-shapes-dropdown"
              className="fixed flex flex-col gap-2 py-2 px-2 bg-white rounded-2xl z-50"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                border: "3px solid #1a1a2e",
                boxShadow: "4px 4px 0 #1a1a2e",
                filter: "url(#hand-drawn)",
              }}
            >
              <button
                onClick={addRect}
                aria-label="Add rectangle"
                className="crayon-icon-btn crayon-icon-blue"
                title="Rectangle"
              >
                <RectIcon />
              </button>
              <button
                onClick={addCircle}
                aria-label="Add circle"
                className="crayon-icon-btn crayon-icon-green"
                title="Circle"
              >
                <CircleIcon />
              </button>
              <button
                onClick={addDiamond}
                aria-label="Add diamond"
                className="crayon-icon-btn crayon-icon-purple"
                title="Diamond"
              >
                <DiamondIcon />
              </button>
              <button
                onClick={addTriangle}
                aria-label="Add triangle"
                className="crayon-icon-btn crayon-icon-orange"
                title="Triangle"
              >
                <TriangleIcon />
              </button>
              <button
                onClick={addLine}
                aria-label="Add line"
                className="crayon-icon-btn crayon-icon-red"
                title="Line"
              >
                <LineIcon />
              </button>
              <button
                onClick={addArrow}
                aria-label="Add arrow"
                className="crayon-icon-btn crayon-icon-orange"
                title="Arrow"
              >
                <ArrowIcon />
              </button>
            </div>,
            document.body
          )}
      </div>
    </aside>
  );
}
