"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onBoardObjectsChange } from "@/lib/supabase/boards";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";
import type { ObjectData } from "@/types";

type PatchFn = (id: string, updates: Partial<ObjectData>) => void;
type AddFn = (id: string, data: ObjectData) => void;
type RemoveFn = (id: string) => void;

export interface BoardObjectsValue {
  objects: Record<string, ObjectData>;
  patchObject: PatchFn;
  addObject: AddFn;
  removeObject: RemoveFn;
}

export const PatchObjectContext = createContext<PatchFn | null>(null);
export const AddObjectContext = createContext<AddFn | null>(null);
export const RemoveObjectContext = createContext<RemoveFn | null>(null);

export const BoardObjectsContext = createContext<BoardObjectsValue | null>(null);

export function useBoardObjectsContext(): BoardObjectsValue {
  const ctx = useContext(BoardObjectsContext);
  if (!ctx) {
    throw new Error("useBoardObjectsContext must be used within BoardObjectsProvider");
  }
  return ctx;
}

export function useBoardObjects() {
  const { boardId } = useBoardContext();
  const [objects, setObjects] = useState<Record<string, ObjectData>>({});

  const patchObject = useCallback<PatchFn>((id, updates) => {
    setObjects((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, ...updates } };
    });
  }, []);

  const addObject = useCallback<AddFn>((id, data) => {
    setObjects((prev) => ({ ...prev, [id]: data }));
  }, []);

  const removeObject = useCallback<RemoveFn>((id) => {
    setObjects((prev) => {
      const next = { ...prev };
      delete next[id];
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
        setObjects((prev) => ({ ...prev, [id]: data }));
      },
      onRemoved(id) {
        setObjects((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      },
    });

    return unsubscribe;
  }, [boardId]);

  return { objects, patchObject, addObject, removeObject };
}
