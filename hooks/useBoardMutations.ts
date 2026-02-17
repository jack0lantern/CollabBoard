"use client";

import { useCallback, useContext } from "react";
import {
  setBoardObject,
  updateBoardObject,
  removeBoardObject,
} from "@/lib/supabase/boards";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";
import {
  PatchObjectContext,
  AddObjectContext,
  RemoveObjectContext,
} from "@/hooks/useBoardObjects";
import type { ObjectData } from "@/types";

export function useBoardMutations() {
  const { boardId } = useBoardContext();
  const patchObject = useContext(PatchObjectContext);
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
    (id: string, updates: Partial<ObjectData>) => {
      patchObject?.(id, updates);
      updateBoardObject(boardId, id, updates);
    },
    [boardId, patchObject]
  );

  const deleteObject = useCallback(
    (id: string) => {
      removeObjectLocal?.(id);
      removeBoardObject(boardId, id);
    },
    [boardId, removeObjectLocal]
  );

  return { addObject, updateObject, deleteObject };
}
