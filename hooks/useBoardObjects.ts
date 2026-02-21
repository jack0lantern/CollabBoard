"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
  type MutableRefObject,
} from "react";
import {
  onBoardObjectsChange,
  syncDiffToDatabase,
  type DragMovePositions,
} from "@/lib/supabase/boards";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";
import type { ObjectData } from "@/types";

const MAX_UNDO_STACK = 50;

/** Compare two ObjectData for equality. Preserves references when unchanged. */
function objectDataEqual(a: ObjectData, b: ObjectData): boolean {
  if (a.id !== b.id || a.type !== b.type || a.x !== b.x || a.y !== b.y) return false;
  if ((a.zIndex ?? 0) !== (b.zIndex ?? 0)) return false;
  if ((a.width ?? 0) !== (b.width ?? 0)) return false;
  if ((a.height ?? 0) !== (b.height ?? 0)) return false;
  if ((a.radius ?? 0) !== (b.radius ?? 0)) return false;
  if ((a.radiusX ?? 0) !== (b.radiusX ?? 0)) return false;
  if ((a.radiusY ?? 0) !== (b.radiusY ?? 0)) return false;
  if ((a.rotation ?? 0) !== (b.rotation ?? 0)) return false;
  if ((a.color ?? "") !== (b.color ?? "")) return false;
  if ((a.text ?? "") !== (b.text ?? "")) return false;
  if ((a.arrowStart ?? false) !== (b.arrowStart ?? false)) return false;
  if ((a.arrowEnd ?? false) !== (b.arrowEnd ?? false)) return false;
  if ((a.fontFamily ?? "") !== (b.fontFamily ?? "")) return false;
  if ((a.fontSize ?? 0) !== (b.fontSize ?? 0)) return false;
  if ((a.fontWeight ?? "") !== (b.fontWeight ?? "")) return false;
  if ((a.fontStyle ?? "") !== (b.fontStyle ?? "")) return false;
  if ((a.textColor ?? "") !== (b.textColor ?? "")) return false;
  if ((a.strokeColor ?? "") !== (b.strokeColor ?? "")) return false;
  if ((a.strokeWidth ?? 0) !== (b.strokeWidth ?? 0)) return false;
  const pa = a.points ?? [];
  const pb = b.points ?? [];
  if (pa.length !== pb.length) return false;
  return pa.every((v, i) => v === pb[i]);
}

/** Merge target snapshot into state, preserving references for unchanged objects. */
function mergeSnapshot(
  current: Record<string, ObjectData>,
  target: Record<string, ObjectData>
): Record<string, ObjectData> {
  const next: Record<string, ObjectData> = {};
  for (const id of Object.keys(target)) {
    const targetObj = target[id];
    const currentObj = current[id];
    if (currentObj && objectDataEqual(currentObj, targetObj)) {
      next[id] = currentObj;
    } else {
      next[id] = targetObj;
    }
  }
  return next;
}

/** Compute IDs that changed between current and target. */
function computeChangedIds(
  current: Record<string, ObjectData>,
  target: Record<string, ObjectData>
): Set<string> {
  const changed = new Set<string>();
  const currentIds = new Set(Object.keys(current));
  const targetIds = new Set(Object.keys(target));

  for (const id of targetIds) {
    if (!currentIds.has(id)) {
      changed.add(id);
    } else {
      const cur = current[id];
      const tgt = target[id];
      if (!cur || !objectDataEqual(cur, tgt)) {
        changed.add(id);
      }
    }
  }
  for (const id of currentIds) {
    if (!targetIds.has(id)) {
      changed.add(id);
    }
  }
  return changed;
}

type PatchFn = (
  id: string,
  updates: Partial<ObjectData>,
  options?: { skipUndo?: boolean }
) => void;
type PatchMultipleFn = (
  updates: Array<{ id: string; updates: Partial<ObjectData> }>,
  options?: { skipUndo?: boolean }
) => void;
type AddFn = (id: string, data: ObjectData) => void;
type RemoveFn = (id: string) => void;

export interface BoardObjectsValue {
  objects: Record<string, ObjectData>;
  patchObject: PatchFn;
  patchMultipleObjects: PatchMultipleFn;
  addObject: AddFn;
  removeObject: RemoveFn;
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Ref for BoardStage to set ephemeral drag handler (applies broadcast positions to Konva nodes). */
  broadcastDragMoveHandlerRef: MutableRefObject<
    ((positions: DragMovePositions) => void) | null
  >;
  /** Ref to current objects Record. Stable reference for LineShape to read other objects without causing re-renders. */
  objectsRef: MutableRefObject<Record<string, ObjectData>>;
  /** Ref for BoardStage to set imperative undo/redo handler. Applies changed objects to Konva nodes. */
  applyUndoRedoRef: MutableRefObject<
    ((changedObjects: Record<string, ObjectData>) => void) | null
  >;
}

export const PatchObjectContext = createContext<PatchFn | null>(null);
export const PatchMultipleContext = createContext<PatchMultipleFn | null>(null);
export const AddObjectContext = createContext<AddFn | null>(null);
export const RemoveObjectContext = createContext<RemoveFn | null>(null);

export const BoardObjectsContext = createContext<BoardObjectsValue | null>(null);

export function useBoardObjectsContext(): BoardObjectsValue {
  const ctx = useContext(BoardObjectsContext);
  if (!ctx) {
    throw new Error(
      "useBoardObjectsContext must be used within BoardObjectsProvider"
    );
  }
  return ctx;
}

export function useBoardObjects() {
  const { boardId } = useBoardContext();
  const [objects, setObjects] = useState<Record<string, ObjectData>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoStackRef = useRef<Record<string, ObjectData>[]>([]);
  const redoStackRef = useRef<Record<string, ObjectData>[]>([]);
  const objectsRef = useRef(objects);
  const broadcastDragMoveHandlerRef = useRef<
    ((positions: DragMovePositions) => void) | null
  >(null);
  const applyUndoRedoRef = useRef<
    ((changedObjects: Record<string, ObjectData>) => void) | null
  >(null);
  useLayoutEffect(() => {
    objectsRef.current = objects;
  });

  const pushUndo = useCallback(() => {
    const snapshot = objectsRef.current;
    undoStackRef.current.push(structuredClone(snapshot));
    if (undoStackRef.current.length > MAX_UNDO_STACK) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(async () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop();
    if (prev == null) return;

    const current = objectsRef.current;
    redoStackRef.current.push(structuredClone(current));
    const merged = mergeSnapshot(current, prev);
    const changedIds = computeChangedIds(current, merged);

    objectsRef.current = merged;

    const changedObjects: Record<string, ObjectData> = {};
    for (const id of changedIds) {
      const obj = merged[id];
      if (obj) changedObjects[id] = obj;
    }
    applyUndoRedoRef.current?.(changedObjects);

    setObjects(merged);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);

    if (boardId) {
      const target = prev;
      const upserts: ObjectData[] = [];
      const deletes: string[] = [];
      for (const id of changedIds) {
        const obj = target[id];
        if (obj) upserts.push(obj);
        else deletes.push(id);
      }
      await syncDiffToDatabase(boardId, { upserts, deletes });
    }
  }, [boardId]);

  const redo = useCallback(async () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    if (next == null) return;

    const current = objectsRef.current;
    undoStackRef.current.push(structuredClone(current));
    const merged = mergeSnapshot(current, next);
    const changedIds = computeChangedIds(current, merged);

    objectsRef.current = merged;

    const changedObjects: Record<string, ObjectData> = {};
    for (const id of changedIds) {
      const obj = merged[id];
      if (obj) changedObjects[id] = obj;
    }
    applyUndoRedoRef.current?.(changedObjects);

    setObjects(merged);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    if (boardId) {
      const target = next;
      const upserts: ObjectData[] = [];
      const deletes: string[] = [];
      for (const id of changedIds) {
        const obj = target[id];
        if (obj) upserts.push(obj);
        else deletes.push(id);
      }
      await syncDiffToDatabase(boardId, { upserts, deletes });
    }
  }, [boardId]);

  const patchObject = useCallback<PatchFn>((id, updates, options) => {
    if (options?.skipUndo !== true) {
      pushUndo();
    }
    setObjects((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, ...updates } };
    });
  }, [pushUndo]);

  const patchMultipleObjects = useCallback<PatchMultipleFn>(
    (updates, options) => {
      if (updates.length === 0) return;
      if (options?.skipUndo !== true) {
        pushUndo();
      }
      setObjects((prev) => {
        const next = { ...prev };
        for (const { id, updates: u } of updates) {
          const existing = next[id];
          if (existing) next[id] = { ...existing, ...u };
        }
        return next;
      });
    },
    [pushUndo]
  );

  const addObject = useCallback<AddFn>((id, data) => {
    pushUndo();
    setObjects((prev) => ({ ...prev, [id]: data }));
  }, [pushUndo]);

  const removeObject = useCallback<RemoveFn>((id) => {
    pushUndo();
    setObjects((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [pushUndo]);

  useEffect(() => {
    setCanUndo(undoStackRef.current.length > 0);
  }, [objects]);

  const pendingChangesRef = useRef<Map<string, ObjectData>>(new Map());
  const coalesceScheduledRef = useRef(false);

  const flushCoalescedChanges = useCallback(() => {
    coalesceScheduledRef.current = false;
    const pending = pendingChangesRef.current;
    if (pending.size === 0) return;
    const batch = new Map(pending);
    pendingChangesRef.current = new Map();
    setObjects((prev) => {
      const next = { ...prev };
      for (const [id, data] of batch) {
        next[id] = data;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = onBoardObjectsChange(boardId, {
      onAdded(id, data) {
        setObjects((prev) => ({ ...prev, [id]: data }));
      },
      onChanged(id, data) {
        pendingChangesRef.current.set(id, data);
        if (!coalesceScheduledRef.current) {
          coalesceScheduledRef.current = true;
          queueMicrotask(flushCoalescedChanges);
        }
      },
      onRemoved(id) {
        setObjects((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      },
      onBroadcastDragMove(positions) {
        broadcastDragMoveHandlerRef.current?.(positions);
      },
    });

    return unsubscribe;
  }, [boardId, flushCoalescedChanges]);

  return {
    objects,
    patchObject,
    patchMultipleObjects,
    addObject,
    removeObject,
    pushUndoSnapshot: pushUndo,
    undo,
    redo,
    canUndo,
    canRedo,
    broadcastDragMoveHandlerRef,
    objectsRef,
    applyUndoRedoRef,
  };
}
