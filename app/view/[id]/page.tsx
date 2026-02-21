"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { getBoard } from "@/lib/supabase/boards";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ProfileModal } from "@/components/ui/ProfileModal";
import { ViewBoardWrapper } from "./ViewBoardWrapper";
import type { Board } from "@/types";

const BoardCanvas = dynamic(
  () => import("@/components/canvas/BoardCanvas").then((m) => m.BoardCanvas),
  { ssr: false }
);

function ProfileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" />
    </svg>
  );
}

export default function ViewBoardPage() {
  const params = useParams();
  const router = useRouter();
  const user = useCurrentUser();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current != null && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserDropdown]);

  const handleLogOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.replace("/login");
    }
    setShowUserDropdown(false);
  }, [router]);

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
          <div className="flex items-center gap-3">
            {user != null ? (
              <div ref={userDropdownRef} className="relative">
                <button
                  onClick={() => setShowUserDropdown((v) => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
                  aria-label="Account"
                  aria-expanded={showUserDropdown}
                  style={{ border: "2px solid var(--crayon-orange)", boxShadow: "2px 2px 0 var(--crayon-orange)", color: "var(--crayon-orange)" }}
                >
                  <ProfileIcon />
                  <span className="text-sm font-bold truncate max-w-[120px]">
                    {user.displayName ?? user.email ?? "Account"}
                  </span>
                </button>
                {showUserDropdown && (
                  <div
                    className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl p-3"
                    style={{
                      background: "white",
                      border: "3px solid #1a1a2e",
                      boxShadow: "4px 4px 0 #1a1a2e",
                    }}
                  >
                    <div className="font-bold text-sm mb-2" style={{ color: "var(--crayon-purple)" }}>
                      {user.displayName ?? user.email ?? "Account"}
                    </div>
                    {user.email != null && (
                      <div
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg mb-2"
                        style={{ background: "#f0f5ff", border: "2px solid var(--crayon-blue)", color: "var(--crayon-blue)" }}
                      >
                        {user.email}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "#e5e7eb" }}>
                      <button
                        onClick={() => { setShowUserDropdown(false); setShowProfileModal(true); }}
                        className="text-xs font-bold underline"
                        style={{ color: "var(--crayon-orange)" }}
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => { setShowUserDropdown(false); void handleLogOut(); }}
                        className="text-xs font-bold underline"
                        style={{ color: "var(--crayon-red)" }}
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/board/${id}`)}`}
                className="font-bold text-sm px-3 py-1.5 rounded-xl transition-all flex items-center gap-2"
                style={{
                  color: "var(--crayon-orange)",
                  border: "2px solid var(--crayon-orange)",
                  boxShadow: "2px 2px 0 var(--crayon-orange)",
                }}
              >
                <ProfileIcon />
                Log in
              </Link>
            )}
          </div>
        </header>
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
        <div className="flex-1 relative overflow-hidden">
          <div className="w-full h-full relative">
            <BoardCanvas boardId={board.id} />
          </div>
        </div>
      </div>
    </ViewBoardWrapper>
  );
}
