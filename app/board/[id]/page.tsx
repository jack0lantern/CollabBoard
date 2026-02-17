"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BoardCanvas } from "@/components/canvas/BoardCanvas";
import { BoardHeader } from "@/components/ui/BoardHeader";
import { Toolbar } from "@/components/ui/Toolbar";
import { UserList } from "@/components/ui/UserList";
import { getBoard } from "@/lib/firebase/boards";
import { BoardClientWrapper } from "./BoardClientWrapper";
import type { Board } from "@/types";

export default function BoardPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [board, setBoard] = useState<Board | null | undefined>(undefined);

  useEffect(() => {
    getBoard(id).then(setBoard);
  }, [id]);

  if (board === undefined) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading board...</p>
      </div>
    );
  }

  if (board === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Board not found</p>
        <Link
          href="/"
          className="text-gray-600 dark:text-gray-400 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const initialSnapshot = board.last_snapshot ?? null;

  return (
    <BoardClientWrapper boardId={id} initialSnapshot={initialSnapshot}>
      <div className="h-screen flex flex-col relative">
        <BoardHeader boardId={id} />
        <div className="flex-1 relative overflow-hidden">
          <BoardCanvas boardId={id} />
          <div className="absolute top-4 left-4 z-10">
            <Toolbar />
          </div>
          <div className="absolute top-4 right-4 z-10">
            <UserList />
          </div>
        </div>
      </div>
    </BoardClientWrapper>
  );
}
