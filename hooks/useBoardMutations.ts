"use client";

import { useCallback, useContext } from "react";
import {
  setBoardObject,
  updateBoardObject,
  updateMultipleBoardObjects,
  removeBoardObject,
} from "@/lib/supabase/boards";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";
import {
  PatchObjectContext,
  PatchMultipleContext,
  AddObjectContext,
  RemoveObjectContext,
} from "@/hooks/useBoardObjects";
import type { ObjectData } from "@/types";

export function useBoardMutations() {
  const { boardId } = useBoardContext();
  const patchObject = useContext(PatchObjectContext);
  const patchMultipleObjects = useContext(PatchMultipleContext);
  const addObjectLocal = useContext(AddObjectContext);
  const removeObjectLocal = useContext(RemoveObjectContext);

  const addObject = useCallback(
    (object: ObjectData) => {
      addObjectLocal?.(object.id, object);
      setBoardObject(boardId, object);
    },
    [boardId, addObjectLocal]
  );

  const updateObject = useCallback(
    (
      id: string,
      updates: Partial<ObjectData>,
      options?: { skipUndo?: boolean }
    ) => {
      patchObject?.(id, updates, options);
      updateBoardObject(boardId, id, updates);
    },
    [boardId, patchObject]
  );

  const updateMultipleObjects = useCallback(
    (
      updates: Array<{ id: string; updates: Partial<ObjectData> }>,
      options?: { skipUndo?: boolean; fullObjects?: ObjectData[] }
    ) => {
      if (updates.length === 0) return;
      patchMultipleObjects?.(updates, options);
      const fullObjects = options?.fullObjects;
      if (fullObjects != null && fullObjects.length === updates.length) {
        void updateMultipleBoardObjects(boardId, fullObjects);
      } else {
        for (const { id, updates: u } of updates) {
          updateBoardObject(boardId, id, u);
        }
      }
    },
    [boardId, patchMultipleObjects]
  );

  const deleteObject = useCallback(
    (id: string) => {
      removeObjectLocal?.(id);
      removeBoardObject(boardId, id);
    },
    [boardId, removeObjectLocal]
  );

  return { addObject, updateObject, updateMultipleObjects, deleteObject };
}
