import type Konva from "konva";
import type { ObjectData, LineConnection, ShapeType } from "@/types";

const DEFAULT_RECT = { width: 100, height: 80 };
const DEFAULT_CIRCLE = 50;
const DEFAULT_STICKY = { width: 200, height: 150 };
const DEFAULT_FRAME = { width: 600, height: 400 };
const DEFAULT_TEXT = { width: 200, height: 32 };

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
    case "frame": {
      const w = obj.width ?? DEFAULT_FRAME.width;
      const h = obj.height ?? DEFAULT_FRAME.height;
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
    case "text": {
      const w = obj.width ?? DEFAULT_TEXT.width;
      const h = obj.height ?? DEFAULT_TEXT.height;
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
  const rot = node.rotation();
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();

  if (type === "rect") {
    const ox = node.x();
    const oy = node.y();
    const w = (node as Konva.Rect).width();
    const h = (node as Konva.Rect).height();
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
    const rx = (node as Konva.Ellipse).radiusX();
    const ry = (node as Konva.Ellipse).radiusY();
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
    const rect = group.findOne("Rect");
    const w = rect?.width() ?? DEFAULT_STICKY.width;
    const h = rect?.height() ?? DEFAULT_STICKY.height;
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

  if (type === "frame") {
    const group = node as Konva.Group;
    const ox = group.x();
    const oy = group.y();
    const rect = group.findOne("Rect");
    const w = (rect?.width() ?? DEFAULT_FRAME.width) * scaleX;
    const h = (rect?.height() ?? DEFAULT_FRAME.height) * scaleY;
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

  if (type === "text") {
    const group = node as Konva.Group;
    const ox = group.x();
    const oy = group.y();
    const text = group.findOne("Text");
    const w = (text?.width() ?? DEFAULT_TEXT.width) * scaleX;
    const h = (text?.height() ?? DEFAULT_TEXT.height) * scaleY;
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

  // type is "line" (all other ShapeTypes handled above)
  const group = node as Konva.Group;
  const ox = group.x();
  const oy = group.y();
  // findOne returns Node; Line/Arrow have points() - assertion needed for type narrowing
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- findOne returns Node, not Line
  const line = (group.findOne("Line") ?? group.findOne("Arrow")) as
    | Konva.Line
    | undefined;
  const pts = line?.points() ?? [0, 0, 100, 100];
  const p0 = rotatePoint(pts[0], pts[1], rot);
  const p1 = rotatePoint(pts[2], pts[3], rot);
  return [
    { x: ox + p0.x, y: oy + p0.y },
    { x: ox + p1.x, y: oy + p1.y },
  ];
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- points[pointIndex] can be undefined
  return p ?? null;
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
/**
 * Find the best pair of snap points to connect two objects with a line.
 * Returns the start/end positions and LineConnections for both endpoints.
 */
export function findConnectorEndpoints(
  fromObj: ObjectData,
  toObj: ObjectData
): {
  x: number;
  y: number;
  points: number[];
  lineStartConnection: LineConnection;
  lineEndConnection: LineConnection;
} | null {
  const fromPoints = getObjectSnapPoints(fromObj);
  const toPoints = getObjectSnapPoints(toObj);
  let bestDistSq = Infinity;
  let bestFromIdx = 0;
  let bestToIdx = 0;
  for (let i = 0; i < fromPoints.length; i++) {
    for (let j = 0; j < toPoints.length; j++) {
      const dx = toPoints[j].x - fromPoints[i].x;
      const dy = toPoints[j].y - fromPoints[i].y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestFromIdx = i;
        bestToIdx = j;
      }
    }
  }
  const start = fromPoints[bestFromIdx];
  const end = toPoints[bestToIdx];
  return {
    x: start.x,
    y: start.y,
    points: [0, 0, end.x - start.x, end.y - start.y],
    lineStartConnection: { objectId: fromObj.id, pointIndex: bestFromIdx },
    lineEndConnection: { objectId: toObj.id, pointIndex: bestToIdx },
  };
}

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
