import type Konva from "konva";
import type { ObjectData, LineConnection, ShapeType } from "@/types";

const DEFAULT_RECT = { width: 100, height: 80 };
const DEFAULT_CIRCLE = 50;
const DEFAULT_STICKY = { width: 200, height: 150 };

function rotatePoint(x: number, y: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/**
 * Get connection points (knobs) for an object in board coordinates.
 * These are the points where a line can snap/attach.
 */
export function getObjectSnapPoints(obj: ObjectData): { x: number; y: number }[] {
  const rot = obj.rotation ?? 0;

  switch (obj.type) {
    case "rect": {
      const w = obj.width ?? DEFAULT_RECT.width;
      const h = obj.height ?? DEFAULT_RECT.height;
      const ox = obj.x;
      const oy = obj.y;
      // Corners in local space (relative to top-left)
      const corners = [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ];
      // Edge midpoints
      const edges = [
        { x: w / 2, y: 0 },
        { x: w, y: h / 2 },
        { x: w / 2, y: h },
        { x: 0, y: h / 2 },
      ];
      return [...corners, ...edges].map((p) => {
        const r = rotatePoint(p.x, p.y, rot);
        return { x: ox + r.x, y: oy + r.y };
      });
    }
    case "sticky": {
      const w = obj.width ?? DEFAULT_STICKY.width;
      const h = obj.height ?? DEFAULT_STICKY.height;
      const ox = obj.x;
      const oy = obj.y;
      const corners = [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ];
      const edges = [
        { x: w / 2, y: 0 },
        { x: w, y: h / 2 },
        { x: w / 2, y: h },
        { x: 0, y: h / 2 },
      ];
      return [...corners, ...edges].map((p) => {
        const r = rotatePoint(p.x, p.y, rot);
        return { x: ox + r.x, y: oy + r.y };
      });
    }
    case "circle": {
      const rx = obj.radiusX ?? obj.radius ?? DEFAULT_CIRCLE;
      const ry = obj.radiusY ?? obj.radius ?? DEFAULT_CIRCLE;
      const ox = obj.x;
      const oy = obj.y;
      // Center + 4 cardinal points on ellipse
      const points = [
        { x: 0, y: 0 },
        { x: rx, y: 0 },
        { x: -rx, y: 0 },
        { x: 0, y: ry },
        { x: 0, y: -ry },
      ];
      return points.map((p) => {
        const r = rotatePoint(p.x, p.y, rot);
        return { x: ox + r.x, y: oy + r.y };
      });
    }
    case "line": {
      const pts = obj.points ?? [0, 0, 100, 100];
      const ox = obj.x;
      const oy = obj.y;
      const p0 = rotatePoint(pts[0], pts[1], rot);
      const p1 = rotatePoint(pts[2], pts[3], rot);
      return [
        { x: ox + p0.x, y: oy + p0.y },
        { x: ox + p1.x, y: oy + p1.y },
      ];
    }
    default:
      return [{ x: obj.x, y: obj.y }];
  }
}

/**
 * Get live snap points from a Konva node (during drag/transform).
 * Use when the node's position/size may differ from persisted object data.
 */
export function getNodeSnapPoints(
  node: Konva.Node,
  type: ShapeType
): { x: number; y: number }[] {
  const rot = node.rotation?.() ?? 0;
  const scaleX = node.scaleX?.() ?? 1;
  const scaleY = node.scaleY?.() ?? 1;

  if (type === "rect") {
    const ox = node.x();
    const oy = node.y();
    const w = (node as Konva.Rect).width?.() ?? DEFAULT_RECT.width;
    const h = (node as Konva.Rect).height?.() ?? DEFAULT_RECT.height;
    const effW = w * scaleX;
    const effH = h * scaleY;
    const corners = [
      { x: 0, y: 0 },
      { x: effW, y: 0 },
      { x: effW, y: effH },
      { x: 0, y: effH },
    ];
    const edges = [
      { x: effW / 2, y: 0 },
      { x: effW, y: effH / 2 },
      { x: effW / 2, y: effH },
      { x: 0, y: effH / 2 },
    ];
    return [...corners, ...edges].map((p) => {
      const r = rotatePoint(p.x, p.y, rot);
      return { x: ox + r.x, y: oy + r.y };
    });
  }

  if (type === "circle") {
    const ox = node.x();
    const oy = node.y();
    const rx = (node as Konva.Ellipse).radiusX?.() ?? DEFAULT_CIRCLE;
    const ry = (node as Konva.Ellipse).radiusY?.() ?? DEFAULT_CIRCLE;
    const effRx = rx * scaleX;
    const effRy = ry * scaleY;
    const points = [
      { x: 0, y: 0 },
      { x: effRx, y: 0 },
      { x: -effRx, y: 0 },
      { x: 0, y: effRy },
      { x: 0, y: -effRy },
    ];
    return points.map((p) => {
      const r = rotatePoint(p.x, p.y, rot);
      return { x: ox + r.x, y: oy + r.y };
    });
  }

  if (type === "sticky") {
    const group = node as Konva.Group;
    const ox = group.x();
    const oy = group.y();
    const rect = group.findOne?.("Rect") as Konva.Rect | undefined;
    const w = rect?.width?.() ?? DEFAULT_STICKY.width;
    const h = rect?.height?.() ?? DEFAULT_STICKY.height;
    const effW = w * scaleX;
    const effH = h * scaleY;
    const corners = [
      { x: 0, y: 0 },
      { x: effW, y: 0 },
      { x: effW, y: effH },
      { x: 0, y: effH },
    ];
    const edges = [
      { x: effW / 2, y: 0 },
      { x: effW, y: effH / 2 },
      { x: effW / 2, y: effH },
      { x: 0, y: effH / 2 },
    ];
    return [...corners, ...edges].map((p) => {
      const r = rotatePoint(p.x, p.y, rot);
      return { x: ox + r.x, y: oy + r.y };
    });
  }

  if (type === "line") {
    const group = node as Konva.Group;
    const ox = group.x();
    const oy = group.y();
    const line = (group.findOne?.("Line") ?? group.findOne?.("Arrow")) as Konva.Line | undefined;
    const pts = line?.points?.() ?? [0, 0, 100, 100];
    const p0 = rotatePoint(pts[0], pts[1], rot);
    const p1 = rotatePoint(pts[2], pts[3], rot);
    return [
      { x: ox + p0.x, y: oy + p0.y },
      { x: ox + p1.x, y: oy + p1.y },
    ];
  }

  return [{ x: node.x(), y: node.y() }];
}

/**
 * Get the world position of a specific snap point for an object.
 */
export function getSnapPointForConnection(
  obj: ObjectData,
  pointIndex: number
): { x: number; y: number } | null {
  const points = getObjectSnapPoints(obj);
  const p = points[pointIndex];
  return p != null ? p : null;
}

/**
 * Find the closest snap point to (worldX, worldY) within the given threshold.
 * Returns the snapped position or the original if none within threshold.
 */
export function findClosestSnapPoint(
  worldX: number,
  worldY: number,
  snapPoints: { x: number; y: number }[],
  threshold: number
): { x: number; y: number; snapped: boolean } {
  let best = { x: worldX, y: worldY, distSq: Infinity };
  for (const p of snapPoints) {
    const dx = p.x - worldX;
    const dy = p.y - worldY;
    const distSq = dx * dx + dy * dy;
    if (distSq < best.distSq && distSq <= threshold * threshold) {
      best = { x: p.x, y: p.y, distSq };
    }
  }
  return {
    x: best.x,
    y: best.y,
    snapped: best.distSq < Infinity,
  };
}

export interface SnapResultWithConnection {
  x: number;
  y: number;
  snapped: boolean;
  connection: LineConnection | null;
}

/**
 * Find the closest snap point across objects, returning connection info when snapped.
 */
export function findClosestSnapPointWithConnection(
  worldX: number,
  worldY: number,
  objects: ObjectData[],
  excludeObjectId: string,
  threshold: number
): SnapResultWithConnection {
  let best = {
    x: worldX,
    y: worldY,
    distSq: Infinity,
    connection: null as LineConnection | null,
  };
  for (const obj of objects) {
    if (obj.id === excludeObjectId) continue;
    const points = getObjectSnapPoints(obj);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = p.x - worldX;
      const dy = p.y - worldY;
      const distSq = dx * dx + dy * dy;
      if (distSq < best.distSq && distSq <= threshold * threshold) {
        best = {
          x: p.x,
          y: p.y,
          distSq,
          connection: { objectId: obj.id, pointIndex: i },
        };
      }
    }
  }
  return {
    x: best.x,
    y: best.y,
    snapped: best.connection != null,
    connection: best.connection,
  };
}
