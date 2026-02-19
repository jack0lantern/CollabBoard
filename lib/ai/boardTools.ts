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

/** Connector/arrow style: line only, arrow at end, or arrows at both ends */
export type ConnectorStyle = "line" | "arrow" | "both";

/** Shape type for createShape (rect or circle) */
export type CreateShapeType = "rect" | "circle";

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
 * Build ObjectData for createShape (rect or circle).
 */
export function buildShapeObject(
  type: CreateShapeType,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  zIndex: number,
  id: string
): ObjectData {
  if (type === "rect") {
    return {
      id,
      type: "rect",
      x,
      y,
      zIndex,
      width,
      height,
      color,
    };
  }
  // circle: use width as diameter for radius
  const radius = Math.max(1, Math.min(width, height) / 2);
  return {
    id,
    type: "circle",
    x,
    y,
    zIndex,
    radius,
    color,
  };
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- objects[id] can be undefined
  if (fromObj == null || toObj == null) return null;

  const result = findConnectorEndpoints(fromObj, toObj);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- findConnectorEndpoints can return null
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

/**
 * Format board state for AI context (compact representation).
 */
export function formatBoardStateForAI(
  objects: Record<string, ObjectData>
): Array<{
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  title?: string;
  color?: string;
}> {
  return Object.values(objects).map((obj) => ({
    id: obj.id,
    type: obj.type,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    text: obj.text,
    title: obj.title,
    color: obj.color ?? obj.strokeColor,
  }));
}
