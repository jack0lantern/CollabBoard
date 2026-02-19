"use client";

import type { ReactNode } from "react";
import { useBoardObjects } from "@/hooks/useBoardObjects";
import {
  BoardObjectsContext,
  PatchObjectContext,
  PatchMultipleContext,
  AddObjectContext,
  RemoveObjectContext,
} from "@/hooks/useBoardObjects";

export function BoardObjectsProvider({ children }: { children: ReactNode }) {
  const value = useBoardObjects();
  return (
    <BoardObjectsContext.Provider value={value}>
      <PatchObjectContext.Provider value={value.patchObject}>
        <PatchMultipleContext.Provider value={value.patchMultipleObjects}>
          <AddObjectContext.Provider value={value.addObject}>
            <RemoveObjectContext.Provider value={value.removeObject}>
              {children}
            </RemoveObjectContext.Provider>
          </AddObjectContext.Provider>
        </PatchMultipleContext.Provider>
      </PatchObjectContext.Provider>
    </BoardObjectsContext.Provider>
  );
}
