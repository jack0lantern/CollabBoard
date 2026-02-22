/**
 * AI tool-callable board operations.
 * These types and helpers define the shape creation/update API for AI integration.
 */

import type { ObjectData, ShapeType } from "@/types";
import { findConnectorEndpoints } from "@/lib/utils/snapPoints";

export const DEFAULT_COLORS = [
  "#fef08a",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
] as const;

/** Padding from the left edge of the view when placing new objects */
const DEFAULT_LEFT_PADDING = 50;

/** Vertical offset from center when placing new objects */
const DEFAULT_TOP_OFFSET = 0;

export interface Viewport {
  position: { x: number; y: number };
  scale: number;
  dimensions: { width: number; height: number };
}

/**
 * Get the default position for a new object: left side of the user's view.
 * X is at the left edge + padding; Y is vertically centered.
 */
export function getDefaultObjectPosition(viewport: Viewport): { x: number; y: number } {
  const { position, scale, dimensions } = viewport;
  const leftEdgeBoardX = -position.x / scale;
  const centerBoardY = (dimensions.height / 2 - position.y) / scale;
  return {
    x: leftEdgeBoardX + DEFAULT_LEFT_PADDING,
    y: centerBoardY + DEFAULT_TOP_OFFSET,
  };
}

/** Connector/arrow style: line only, arrow at end, or arrows at both ends */
export type ConnectorStyle = "line" | "arrow" | "both";

/** Shape type for createShape (rect, circle, diamond, triangle) */
export type CreateShapeType = "rect" | "circle" | "diamond" | "triangle";

export function getNextZIndex(objects: Record<string, ObjectData>): number {
  const values = Object.values(objects).filter(
    (o): o is ObjectData =>
      typeof o === "object" && "id" in o && "type" in o
  );
  const max = Math.max(0, ...values.map((o) => o.zIndex ?? 0));
  return max + 1;
}

/**
 * Build ObjectData for createStickyNote.
 */
export function buildStickyNoteObject(
  text: string,
  x: number,
  y: number,
  color: string,
  zIndex: number,
  id: string
): ObjectData {
  return {
    id,
    type: "sticky",
    x,
    y,
    zIndex,
    width: 200,
    height: 150,
    color,
    text,
  };
}

/**
 * Build ObjectData for createShape (rect, circle, diamond, triangle).
 */
export function buildShapeObject(
  type: CreateShapeType,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  zIndex: number,
  id: string,
  text?: string
): ObjectData {
  const base = { id, x, y, zIndex, color, ...(text != null && text !== "" && { text }) };
  if (type === "rect") {
    return { ...base, type: "rect", width, height };
  }
  if (type === "circle") {
    const radius = Math.max(1, Math.min(width, height) / 2);
    return { ...base, type: "circle", radius };
  }
  // diamond | triangle
  return { ...base, type, width, height };
}

/**
 * Build ObjectData for createFrame.
 */
export function buildFrameObject(
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
  id: string
): ObjectData {
  return {
    id,
    type: "frame",
    x,
    y,
    zIndex,
    width,
    height,
    title,
    frameColor: "#ffffff",
    strokeColor: "#e5e7eb",
    strokeWidth: 1,
  };
}

/**
 * Build ObjectData for pen strokes (straight lines or curves).
 * Points are relative to (x, y); tension: 0 = straight, 0.5 = smooth curves.
 */
export function buildPenObject(
  x: number,
  y: number,
  points: number[],
  strokeColor: string,
  strokeWidth: number,
  tension: number,
  zIndex: number,
  id: string
): ObjectData {
  const normalizedPoints = points.length >= 4 ? points : [0, 0, 1, 1];
  return {
    id,
    type: "pen",
    x,
    y,
    zIndex,
    points: normalizedPoints,
    strokeColor,
    strokeWidth,
    tension,
  };
}

/**
 * Build ObjectData for createConnector (line/arrow between two objects).
 */
export function buildConnectorObject(
  fromId: string,
  toId: string,
  style: ConnectorStyle,
  objects: Record<string, ObjectData>,
  zIndex: number,
  id: string
): ObjectData | null {
  const fromObj = objects[fromId];
  const toObj = objects[toId];
  if (fromObj == null || toObj == null) return null;

  const result = findConnectorEndpoints(fromObj, toObj);
  if (result == null) return null;

  const arrowStart = style === "both";
  const arrowEnd = style === "arrow" || style === "both";

  return {
    id,
    type: "line",
    x: result.x,
    y: result.y,
    zIndex,
    points: result.points,
    color: "#6b7280",
    strokeColor: "#6b7280",
    arrowStart,
    arrowEnd,
    lineStartConnection: result.lineStartConnection,
    lineEndConnection: result.lineEndConnection,
  };
}

/** Compact object representation for AI context */
export type BoardObjectForAI = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  title?: string;
  color?: string;
  strokeColor?: string;
  points?: number[];
  tension?: number;
  selected?: boolean;
};

/** Board state including selection for AI context */
export interface BoardStateForAI {
  objects: BoardObjectForAI[];
  selectedIds: string[];
}

/**
 * Format board state for AI context (compact representation).
 * Includes selection so the agent knows what the user has selected.
 */
export function formatBoardStateForAI(
  objects: Record<string, ObjectData>,
  selectedIds: string[] = []
): BoardStateForAI {
  const selectedSet = new Set(selectedIds);
  const objectsArray: BoardObjectForAI[] = Object.values(objects).map((obj) => {
    const base: BoardObjectForAI = {
      id: obj.id,
      type: obj.type,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      text: obj.text,
      title: obj.title,
      color: obj.color ?? obj.strokeColor,
      selected: selectedSet.has(obj.id),
    };
    if (obj.type === "line" || obj.type === "pen") {
      return { ...base, strokeColor: obj.strokeColor, points: obj.points, tension: obj.tension };
    }
    return base;
  });
  return { objects: objectsArray, selectedIds };
}
