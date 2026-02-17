"use client";

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import {
  getBoardObjects,
  seedBoardObjects,
} from "@/lib/firebase/rtdb";
import type { ObjectData } from "@/types";

interface BoardContextValue {
  boardId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) {
    throw new Error("useBoardContext must be used within a RealtimeBoardProvider");
  }
  return ctx;
}

interface RealtimeBoardProviderProps {
  boardId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  initialSnapshot: Record<string, ObjectData> | null;
  children: ReactNode;
}

export function RealtimeBoardProvider({
  boardId,
  userId,
  displayName,
  avatarUrl,
  initialSnapshot,
  children,
}: RealtimeBoardProviderProps) {
  // Seed RTDB from Firestore snapshot if RTDB is empty
  useEffect(() => {
    if (!boardId || !initialSnapshot) return;

    let cancelled = false;

    async function seedIfEmpty() {
      const existing = await getBoardObjects(boardId);
      if (cancelled) return;

      const hasObjects = Object.keys(existing).length > 0;
      if (!hasObjects && initialSnapshot) {
        await seedBoardObjects(boardId, initialSnapshot);
      }
    }

    seedIfEmpty();

    return () => {
      cancelled = true;
    };
  }, [boardId, initialSnapshot]);

  return (
    <BoardContext.Provider value={{ boardId, userId, displayName, avatarUrl }}>
      {children}
    </BoardContext.Provider>
  );
}
