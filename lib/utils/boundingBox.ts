import type { ObjectData } from "@/types";

const DEFAULT_RECT = { width: 100, height: 80 };
const DEFAULT_CIRCLE = 50;
const DEFAULT_STICKY = { width: 200, height: 150 };
const DEFAULT_FRAME = { width: 600, height: 400 };
const DEFAULT_TEXT = { width: 200, height: 32 };

/**
 * Get the bounding box of an object in board coordinates.
 */
export function getObjectBoundingBox(obj: ObjectData): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  switch (obj.type) {
    case "rect":
      return {
        x: obj.x,
        y: obj.y,
        width: obj.width ?? DEFAULT_RECT.width,
        height: obj.height ?? DEFAULT_RECT.height,
      };
    case "circle": {
      const rx = obj.radiusX ?? obj.radius ?? DEFAULT_CIRCLE;
      const ry = obj.radiusY ?? obj.radius ?? DEFAULT_CIRCLE;
      return {
        x: obj.x - rx,
        y: obj.y - ry,
        width: rx * 2,
        height: ry * 2,
      };
    }
    case "sticky":
      return {
        x: obj.x,
        y: obj.y,
        width: obj.width ?? DEFAULT_STICKY.width,
        height: obj.height ?? DEFAULT_STICKY.height,
      };
    case "frame":
      return {
        x: obj.x,
        y: obj.y,
        width: obj.width ?? DEFAULT_FRAME.width,
        height: obj.height ?? DEFAULT_FRAME.height,
      };
    case "text":
      return {
        x: obj.x,
        y: obj.y,
        width: obj.width ?? DEFAULT_TEXT.width,
        height: obj.height ?? DEFAULT_TEXT.height,
      };
    case "line":
    case "pen": {
      const pts = obj.points ?? [0, 0, 100, 100];
      let minX = pts[0];
      let minY = pts[1];
      let maxX = pts[0];
      let maxY = pts[1];
      for (let i = 2; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]);
        minY = Math.min(minY, pts[i + 1]);
        maxX = Math.max(maxX, pts[i]);
        maxY = Math.max(maxY, pts[i + 1]);
      }
      return {
        x: obj.x + minX,
        y: obj.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    default:
      return { x: obj.x, y: obj.y, width: 50, height: 50 };
  }
}

/**
 * Compute the bounding box that fully contains all given objects.
 */
export function computeGroupBoundingBox(
  objects: ObjectData[]
): { x: number; y: number; width: number; height: number } {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const boxes = objects.map(getObjectBoundingBox);
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if rect a is fully contained within rect b (a's bounds are inside b's).
 */
export function isFullyContained(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x >= b.x &&
    a.y >= b.y &&
    a.x + a.width <= b.x + b.width &&
    a.y + a.height <= b.y + b.height
  );
}

export type TransformBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

/** Epsilon for anchor detection - avoids flip-flopping when deltas are nearly equal */
const ANCHOR_EPSILON = 1e-6;

/** Konva Transformer anchor names */
const ANCHORS_LEFT = ["top-left", "middle-left", "bottom-left"];
const ANCHORS_TOP = ["top-left", "top-center", "top-right"];

/**
 * Derive leftMoved/topMoved from Konva's getActiveAnchor().
 * When dragging left-side handles, anchor right. When dragging top handles, anchor bottom.
 */
function anchorFromActiveHandle(activeAnchor: string | null | undefined): {
  leftMoved: boolean;
  topMoved: boolean;
} | null {
  if (!activeAnchor) return null;
  return {
    leftMoved: ANCHORS_LEFT.includes(activeAnchor),
    topMoved: ANCHORS_TOP.includes(activeAnchor),
  };
}

/**
 * boundBoxFunc helper: clamp to minimum size while keeping the opposite edge/corner
 * anchored. When the user drags one handle, the opposite handle stays fixed.
 * Uses getActiveAnchor() when available for reliable corner/edge detection; falls back
 * to delta-based inference otherwise.
 * When preserveAspectRatio is true (e.g. for text), clamping scales both dimensions
 * uniformly to maintain the box's aspect ratio.
 */
export function boundBoxWithAnchorPreservation(
  oldBox: TransformBox,
  newBox: TransformBox,
  minWidth: number,
  minHeight: number,
  anchorBox?: TransformBox | null,
  activeAnchor?: string | null,
  preserveAspectRatio?: boolean
): TransformBox {
  const ref = anchorBox ?? oldBox;
  const { rotation } = newBox;
  let { x, y, width, height } = newBox;

  const fromAnchor = anchorFromActiveHandle(activeAnchor);
  let leftMoved: boolean;
  let topMoved: boolean;

  if (fromAnchor) {
    leftMoved = fromAnchor.leftMoved;
    topMoved = fromAnchor.topMoved;
  } else {
    const leftDelta = Math.abs(newBox.x - ref.x);
    const rightDelta = Math.abs(
      newBox.x + newBox.width - (ref.x + ref.width)
    );
    leftMoved = leftDelta > rightDelta + ANCHOR_EPSILON;
    const topDelta = Math.abs(newBox.y - ref.y);
    const bottomDelta = Math.abs(
      newBox.y + newBox.height - (ref.y + ref.height)
    );
    topMoved = topDelta > bottomDelta + ANCHOR_EPSILON;
  }

  // Compute anchor corner once — the opposite corner that stays fixed.
  // Use it for both dimensions so corner resizes are atomic (reason 3).
  const anchorCornerX = leftMoved ? ref.x + ref.width : ref.x;
  const anchorCornerY = topMoved ? ref.y + ref.height : ref.y;

  const needsWidthClamp = width < minWidth;
  const needsHeightClamp = height < minHeight;

  if (needsWidthClamp || needsHeightClamp) {
    if (preserveAspectRatio && width > 0 && height > 0) {
      const scale = Math.max(minWidth / width, minHeight / height);
      width *= scale;
      height *= scale;
      x = leftMoved ? anchorCornerX - width : anchorCornerX;
      y = topMoved ? anchorCornerY - height : anchorCornerY;
    } else {
      if (needsWidthClamp) {
        width = minWidth;
        x = leftMoved ? anchorCornerX - minWidth : anchorCornerX;
      }
      if (needsHeightClamp) {
        height = minHeight;
        y = topMoved ? anchorCornerY - minHeight : anchorCornerY;
      }
    }
  }

  return { x, y, width, height, rotation };
}

/**
 * Check if two axis-aligned rectangles intersect.
 */
export function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Get objects that overlap the frame's bounding box and have a higher z-index.
 * Used when dragging a frame to move its contents along with it.
 */
export function getObjectsOnTopOfFrame(
  frameId: string,
  frameBox: { x: number; y: number; width: number; height: number },
  frameZIndex: number,
  allObjects: ObjectData[]
): ObjectData[] {
  const result: ObjectData[] = [];
  for (const obj of allObjects) {
    if (obj.id === frameId) continue;
    if ((obj.zIndex ?? 0) <= frameZIndex) continue;
    const objBox = getObjectBoundingBox(obj);
    if (rectsIntersect(frameBox, objBox)) {
      result.push(obj);
    }
  }
  return result;
}

/**
 * Get the highest zIndex among frames that intersect the given object's bounding box.
 * Returns null if no frames intersect.
 */
export function getTopmostFrameZIndex(
  obj: ObjectData,
  allObjects: ObjectData[]
): number | null {
  const objBox = getObjectBoundingBox(obj);
  let maxZ: number | null = null;
  for (const o of allObjects) {
    if (o.type !== "frame" || o.id === obj.id) continue;
    const frameBox = getObjectBoundingBox(o);
    if (rectsIntersect(objBox, frameBox)) {
      const z = o.zIndex ?? 0;
      maxZ = maxZ == null ? z : Math.max(maxZ, z);
    }
  }
  return maxZ;
}

/**
 * Whether a line is "part of" a frame for drag purposes.
 * A line moves with the frame only if:
 * - Both ends are attached to objects on the frame, OR
 * - One end is attached to an object on the frame and the other end is free (no connection).
 * A line is NOT part of the frame if one end is on a frame object but the other is attached to something outside the frame.
 */
export function isLinePartOfFrame(
  line: ObjectData,
  frameId: string,
  objectsOnFrameIds: Set<string>
): boolean {
  if (line.type !== "line") return false;
  const startId = line.lineStartConnection?.objectId;
  const endId = line.lineEndConnection?.objectId;
  const startOnFrame = startId != null && objectsOnFrameIds.has(startId);
  const endOnFrame = endId != null && objectsOnFrameIds.has(endId);
  const endFree = endId == null;
  const startFree = startId == null;
  return (
    (startOnFrame && (endOnFrame || endFree)) ||
    (endOnFrame && (startOnFrame || startFree))
  );
}

/**
 * Effective zIndex for a line when sorting for render.
 * If a line is connected to an object that sits on a frame, the line should render above that frame.
 */
export function getLineEffectiveZIndex(
  line: ObjectData,
  allObjects: ObjectData[]
): number {
  if (line.type !== "line") return line.zIndex ?? 0;
  const baseZ = line.zIndex ?? 0;
  let minAboveFrame = baseZ;
  const connectedIds = [
    line.lineStartConnection?.objectId,
    line.lineEndConnection?.objectId,
  ].filter((id): id is string => id != null);
  for (const frame of allObjects) {
    if (frame.type !== "frame") continue;
    const frameBox = getObjectBoundingBox(frame);
    const frameZ = frame.zIndex ?? 0;
    for (const objId of connectedIds) {
      const obj = allObjects.find((o) => o.id === objId);
      if (!obj) continue;
      if ((obj.zIndex ?? 0) <= frameZ) continue;
      const objBox = getObjectBoundingBox(obj);
      if (rectsIntersect(frameBox, objBox)) {
        minAboveFrame = Math.max(minAboveFrame, frameZ + 1);
        break;
      }
    }
  }
  return minAboveFrame;
}
