import type { ObjectData } from "@/types";

const DEFAULT_RECT = { width: 100, height: 80 };
const DEFAULT_CIRCLE = 50;
const DEFAULT_STICKY = { width: 200, height: 150 };

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
    case "line": {
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

/**
 * boundBoxFunc helper: clamp to minimum size while keeping the opposite edge/corner
 * anchored. When the user drags one handle, the opposite handle stays fixed.
 * @param anchorBox - Box at transform start (use this for anchor detection; falls back to oldBox if null)
 */
export function boundBoxWithAnchorPreservation(
  oldBox: TransformBox,
  newBox: TransformBox,
  minWidth: number,
  minHeight: number,
  anchorBox?: TransformBox | null
): TransformBox {
  let { x, y, width, height, rotation } = newBox;

  const ref = anchorBox ?? oldBox;
  // Infer anchor from which edge moved less (more robust than position threshold)
  const leftDelta = Math.abs(newBox.x - ref.x);
  const rightDelta = Math.abs(
    (newBox.x + newBox.width) - (ref.x + ref.width)
  );
  const leftMoved = leftDelta > rightDelta;
  const topDelta = Math.abs(newBox.y - ref.y);
  const bottomDelta = Math.abs(
    (newBox.y + newBox.height) - (ref.y + ref.height)
  );
  const topMoved = topDelta > bottomDelta;

  if (width < 0) {
    // User dragged past opposite edge - allow flip, keep anchor fixed
    const absWidth = Math.max(minWidth, Math.abs(width));
    if (leftMoved) {
      const rightEdge = ref.x + ref.width;
      x = rightEdge;
      width = -absWidth;
    } else {
      const leftEdge = ref.x;
      x = leftEdge + absWidth;
      width = -absWidth;
    }
  } else if (width < minWidth) {
    const clampedWidth = Math.max(minWidth, width);
    if (leftMoved) {
      const rightEdge = ref.x + ref.width;
      x = rightEdge - clampedWidth;
      width = clampedWidth;
    } else {
      x = ref.x;
      width = clampedWidth;
    }
  }

  if (height < 0) {
    // User dragged past opposite edge - allow flip, keep anchor fixed
    const absHeight = Math.max(minHeight, Math.abs(height));
    if (topMoved) {
      const bottomEdge = ref.y + ref.height;
      y = bottomEdge;
      height = -absHeight;
    } else {
      const topEdge = ref.y;
      y = topEdge + absHeight;
      height = -absHeight;
    }
  } else if (height < minHeight) {
    const clampedHeight = Math.max(minHeight, height);
    if (topMoved) {
      const bottomEdge = ref.y + ref.height;
      y = bottomEdge - clampedHeight;
      height = clampedHeight;
    } else {
      y = ref.y;
      height = clampedHeight;
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
