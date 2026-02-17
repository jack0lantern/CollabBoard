"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { BoardHeader } from "@/components/ui/BoardHeader";
import { Toolbar } from "@/components/ui/Toolbar";
import { UserList } from "@/components/ui/UserList";
import { getBoard } from "@/lib/firebase/boards";
import { BoardClientWrapper } from "./BoardClientWrapper";
import type { Board } from "@/types";

const BoardCanvas = dynamic(
  () => import("@/components/canvas/BoardCanvas").then((m) => m.BoardCanvas),
  { ssr: false }
);

export default function BoardPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [board, setBoard] = useState<Board | null | undefined>(undefined);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setBoard(null);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      getBoard(id).then(setBoard);
    });
    return unsubscribe;
  }, [id, router]);

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
        <BoardHeader
          boardId={id}
          board={board}
          onBoardUpdated={setBoard}
        />
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
