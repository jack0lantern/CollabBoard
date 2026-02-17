"use client";

import { useCallback } from "react";
import {
  setBoardObject,
  updateBoardObject,
  removeBoardObject,
} from "@/lib/firebase/rtdb";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";
import type { ObjectData } from "@/types";

export function useBoardMutations() {
  const { boardId } = useBoardContext();

  const addObject = useCallback(
    (object: ObjectData) => {
      setBoardObject(boardId, object);
    },
    [boardId]
  );

  const updateObject = useCallback(
    (id: string, updates: Partial<ObjectData>) => {
      updateBoardObject(boardId, id, updates);
    },
    [boardId]
  );

  const deleteObject = useCallback(
    (id: string) => {
      removeBoardObject(boardId, id);
    },
    [boardId]
  );

  return { addObject, updateObject, deleteObject };
}
