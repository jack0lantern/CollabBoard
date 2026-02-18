"use client";

import { createContext, useContext, type ReactNode } from "react";

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
  children: ReactNode;
}

export function RealtimeBoardProvider({
  boardId,
  userId,
  displayName,
  avatarUrl,
  children,
}: RealtimeBoardProviderProps) {
  return (
    <BoardContext.Provider value={{ boardId, userId, displayName, avatarUrl }}>
      {children}
    </BoardContext.Provider>
  );
}
