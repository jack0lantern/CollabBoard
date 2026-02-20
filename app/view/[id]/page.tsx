"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { getBoard } from "@/lib/supabase/boards";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserBadge } from "@/components/ui/UserBadge";
import { ViewBoardWrapper } from "./ViewBoardWrapper";
import type { Board } from "@/types";

const BoardCanvas = dynamic(
  () => import("@/components/canvas/BoardCanvas").then((m) => m.BoardCanvas),
  { ssr: false }
);

export default function ViewBoardPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  const user = useCurrentUser();

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.replace("/login");
    }
  };

  useEffect(() => {
    if (!id) return;
    const supabase = createSupabaseClient();
    void getBoard(id).then(async (boardData) => {
      if (!boardData) {
        setBoard(null);
        return;
      }
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const isOwner = boardData.owner_id === session.user.id;
          const userEmail = (session.user.email ?? "").toLowerCase();
          const role = userEmail ? boardData.shared_with?.[userEmail] : undefined;
          const canEdit =
            isOwner ||
            role === "editor" ||
            (boardData.is_public === true && !boardData.is_public_readonly);
          if (canEdit) {
            router.replace(`/board/${id}`);
            return;
          }
        }
      }
      setBoard(boardData);
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
          href="/"
          className="text-gray-600 dark:text-gray-400 hover:underline"
        >
          ← Go home
        </Link>
      </div>
    );
  }

  const canView =
    (board.is_public ?? false) || (board.is_public_readonly ?? false);

  if (!canView) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">This board is private</p>
        <Link
          href="/"
          className="text-gray-600 dark:text-gray-400 hover:underline"
        >
          ← Go home
        </Link>
      </div>
    );
  }

  return (
    <ViewBoardWrapper boardId={board.id}>
      <div className="h-screen flex flex-col relative">
        <header
          className="flex items-center justify-between px-4 py-2 bg-white flex-shrink-0"
          style={{ borderBottom: "3px solid #1a1a2e" }}
        >
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-bold text-sm px-3 py-1 rounded-xl transition-all"
              style={{
                color: "var(--crayon-blue)",
                border: "2px solid var(--crayon-blue)",
              }}
            >
              ← Home
            </Link>
            <h1
              className="font-sketch text-xl font-bold"
              style={{ color: "var(--crayon-purple)" }}
            >
              {board.title}
            </h1>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: "var(--crayon-blue)",
                color: "white",
              }}
            >
              View only
            </span>
          </div>
          {user != null && (
            <div className="flex items-center gap-3">
              <UserBadge
                user={{
                  displayName: user.displayName,
                  email: user.email,
                }}
              />
              <button
                onClick={() => { void handleSignOut(); }}
                className="text-sm font-bold underline px-2"
                style={{ color: "var(--crayon-red)" }}
              >
                Sign out
              </button>
            </div>
          )}
        </header>
        <div className="flex-1 relative overflow-hidden">
          <div className="w-full h-full relative">
            <BoardCanvas boardId={board.id} />
          </div>
        </div>
      </div>
    </ViewBoardWrapper>
  );
}
