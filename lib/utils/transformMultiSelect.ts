import type { ObjectData } from "@/types";

const MIN_SIZE = 20;
const MIN_RADIUS = 10;

/**
 * Compute the transformed object updates for a single shape after a multi-select
 * transform. Used by MultiSelectTransformer and for unit testing.
 */
export function computeTransformedObject(
  obj: ObjectData,
  transform: { x: number; y: number; scaleX: number; scaleY: number; rotation?: number }
): Partial<ObjectData> {
  const { x, y, scaleX, scaleY, rotation } = transform;

  switch (obj.type) {
    case "rect": {
      const w = (obj.width ?? 100) * scaleX;
      const h = (obj.height ?? 80) * scaleY;
      return {
        x,
        y,
        width: Math.max(MIN_SIZE, w),
        height: Math.max(MIN_SIZE, h),
        rotation: rotation ?? undefined,
      };
    }
    case "circle": {
      const rx = (obj.radiusX ?? obj.radius ?? 50) * scaleX;
      const ry = (obj.radiusY ?? obj.radius ?? 50) * scaleY;
      return {
        x,
        y,
        radiusX: Math.max(MIN_RADIUS, rx),
        radiusY: Math.max(MIN_RADIUS, ry),
        radius: undefined,
        rotation: rotation ?? undefined,
      };
    }
    case "sticky": {
      const w = (obj.width ?? 200) * scaleX;
      const h = (obj.height ?? 150) * scaleY;
      return {
        x,
        y,
        width: Math.max(MIN_SIZE, w),
        height: Math.max(MIN_SIZE, h),
        rotation: rotation ?? undefined,
      };
    }
    case "line": {
      const pts = obj.points ?? [0, 0, 100, 100];
      const newPoints = pts.map((p, i) =>
        i % 2 === 0 ? p * scaleX : p * scaleY
      );
      return {
        x,
        y,
        points: newPoints,
        rotation: rotation ?? undefined,
      };
    }
    default:
      return { x, y };
  }
}
