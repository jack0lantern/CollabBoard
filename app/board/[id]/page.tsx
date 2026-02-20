"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { BoardHeader } from "@/components/ui/BoardHeader";
import { ViewportProvider } from "@/components/providers/ViewportProvider";
import { Toolbar } from "@/components/ui/Toolbar";
import { UserList } from "@/components/ui/UserList";
import { ChatbotButton } from "@/components/ui/ChatbotButton";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { getBoard } from "@/lib/supabase/boards";
import { BoardClientWrapper } from "./BoardClientWrapper";
import type { Board } from "@/types";

function ChatbotFloatingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ChatbotButton onClick={() => setOpen((o) => !o)} isOpen={open} />
      <div
        className={`fixed top-32 bottom-20 right-6 z-40 w-96 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChatPanel onClose={() => setOpen(false)} />
      </div>
    </>
  );
}

const BoardCanvas = dynamic(
  () => import("@/components/canvas/BoardCanvas").then((m) => m.BoardCanvas),
  { ssr: false }
);

export default function BoardPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const router = useRouter();
  const [board, setBoard] = useState<Board | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const supabase = createSupabaseClient();
    if (!supabase) {
      queueMicrotask(() => setBoard(null));
      return;
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      void getBoard(id).then(setBoard);
    });
  }, [id, router]);

  if (!id || board === undefined) {
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
          href="/dashboard"
          className="text-gray-600 dark:text-gray-400 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <BoardClientWrapper boardId={id}>
      <div className="h-screen flex flex-col relative">
        <BoardHeader
          boardId={id}
          board={board}
          onBoardUpdated={setBoard}
        />
        <div className="flex-1 flex relative overflow-hidden">
          <Toolbar />
          <div className="flex-1 relative overflow-hidden">
            <ViewportProvider>
              <BoardCanvas boardId={id} />
            <div className="absolute top-4 right-4 z-10">
              <UserList />
            </div>
              <ChatbotFloatingButton />
            </ViewportProvider>
          </div>
        </div>
      </div>
    </BoardClientWrapper>
  );
}
