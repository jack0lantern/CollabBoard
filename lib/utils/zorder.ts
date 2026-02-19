import type { ObjectData } from "@/types";

export function getMaxZIndex(objects: ObjectData[]): number {
  return Math.max(0, ...objects.map((o) => o.zIndex ?? 0));
}

export function getMinZIndex(objects: ObjectData[]): number {
  const indices = objects.map((o) => o.zIndex ?? 0);
  return Math.min(0, ...indices);
}

/**
 * Compute new zIndex for bringing shape(s) to front.
 */
export function computeBringToFront(
  objects: ObjectData[],
  ids: string[]
): Map<string, number> {
  const maxZ = getMaxZIndex(objects);
  const updates = new Map<string, number>();
  ids.forEach((id, i) => {
    updates.set(id, maxZ + 1 + i);
  });
  return updates;
}

/**
 * Compute new zIndex for sending shape(s) to back.
 */
export function computeSendToBack(
  objects: ObjectData[],
  ids: string[]
): Map<string, number> {
  const minZ = getMinZIndex(objects);
  const updates = new Map<string, number>();
  ids.forEach((id, i) => {
    updates.set(id, minZ - ids.length + i);
  });
  return updates;
}

/**
 * Compute new zIndex for bringing shape(s) forward by one step.
 * For multiple selected, moves the whole block as a unit to preserve relative order.
 */
export function computeBringForward(
  objects: ObjectData[],
  ids: string[]
): Map<string, number> {
  const sorted = [...objects].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const idSet = new Set(ids);
  const updates = new Map<string, number>();

  const selected = sorted.filter((o) => idSet.has(o.id));
  if (selected.length === 0) return updates;

  const topSelected = selected[selected.length - 1];
  const topIdx = sorted.indexOf(topSelected);
  const nextObj = sorted[topIdx + 1];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- sorted[topIdx+1] can be undefined
  if (nextObj != null) {
    updates.set(topSelected.id, nextObj.zIndex ?? 0);
    updates.set(nextObj.id, topSelected.zIndex ?? 0);
  } else {
    const maxZ = getMaxZIndex(objects);
    updates.set(topSelected.id, maxZ + 1);
  }
  return updates;
}

/**
 * Compute new zIndex for sending shape(s) backward by one step.
 * For multiple selected, moves the whole block as a unit to preserve relative order.
 */
export function computeSendBackward(
  objects: ObjectData[],
  ids: string[]
): Map<string, number> {
  const sorted = [...objects].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const idSet = new Set(ids);
  const updates = new Map<string, number>();

  const selected = sorted.filter((o) => idSet.has(o.id));
  if (selected.length === 0) return updates;

  const bottomSelected = selected[0];
  const bottomIdx = sorted.indexOf(bottomSelected);
  const prevObj = sorted[bottomIdx - 1];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- sorted[bottomIdx-1] can be undefined
  if (prevObj != null) {
    updates.set(bottomSelected.id, prevObj.zIndex ?? 0);
    updates.set(prevObj.id, bottomSelected.zIndex ?? 0);
  } else {
    const minZ = getMinZIndex(objects);
    updates.set(bottomSelected.id, minZ - 1);
  }
  return updates;
}
