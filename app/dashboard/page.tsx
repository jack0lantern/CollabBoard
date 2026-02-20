"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  createBoard,
  subscribeToBoardsByOwner,
} from "@/lib/supabase/boards";
import { UserBadge } from "@/components/ui/UserBadge";
import type { Board } from "@/types";
import type { User } from "@supabase/supabase-js";

function getDisplayName(user: User): string {
  const meta = user.user_metadata ?? {};
  const firstName = meta.first_name ?? meta.given_name ?? null;
  const lastName = meta.last_name ?? meta.family_name ?? null;
  return (
    meta.full_name ??
    meta.name ??
    ([firstName, lastName].filter(Boolean).join(" ") || user.email) ??
    "Account"
  );
}

const CARD_COLORS = [
  { border: "#ff4757", shadow: "#cc1a2a", bg: "#fff5f5", emoji: "🔴" },
  { border: "#2979ff", shadow: "#0046cc", bg: "#f0f5ff", emoji: "🔵" },
  { border: "#00c853", shadow: "#007a32", bg: "#f0fff5", emoji: "🟢" },
  { border: "#ffd600", shadow: "#b39700", bg: "#fffde7", emoji: "🟡" },
  { border: "#aa00ff", shadow: "#7200ab", bg: "#faf0ff", emoji: "🟣" },
  { border: "#ff6d00", shadow: "#b34800", bg: "#fff5f0", emoji: "🟠" },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      setUser(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      setUser(session.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToBoardsByOwner(user.id, (newBoards) => {
      setBoards(newBoards);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleCreateBoard = async () => {
    if (!user || creating) return;
    setCreating(true);
    setError("");

    try {
      const board = await createBoard("Untitled Board", user.id);
      if (board) {
        router.push(`/board/${board.id}`);
      } else {
        setError("Failed to create board");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.replace("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen paper-bg flex items-center justify-center">
        <div
          className="px-8 py-4 rounded-2xl font-sketch text-2xl font-bold"
          style={{
            border: "3px solid var(--crayon-blue)",
            boxShadow: "4px 4px 0 var(--crayon-blue)",
            background: "white",
            color: "var(--crayon-blue)",
          }}
        >
          Loading your boards... 📚
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-bg">
      {/* Header */}
      <header className="bg-white" style={{ borderBottom: "3px solid #1a1a2e" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-sketch text-3xl font-bold" style={{ color: "var(--crayon-red)" }}>
              Collab
            </span>
            <span className="font-sketch text-3xl font-bold" style={{ color: "var(--crayon-blue)" }}>
              Board
            </span>
            <span
              className="ml-2 px-3 py-0.5 rounded-full font-bold text-sm"
              style={{
                background: "var(--crayon-yellow)",
                border: "2px solid #b39700",
                color: "#1a1a2e",
              }}
            >
              My Boards 📋
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user != null && (
              <>
                <UserBadge
                  user={{
                    displayName: getDisplayName(user),
                    email: user.email ?? null,
                  }}
                />
                <button
                  onClick={() => { void handleSignOut(); }}
                  className="text-sm font-bold underline px-2"
                  style={{ color: "var(--crayon-red)" }}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {boards.length === 0 ? (
          <div className="text-center py-16">
            <div className="font-sketch text-5xl mb-4" style={{ color: "var(--crayon-purple)" }}>
              🎨 No boards yet!
            </div>
            <p className="text-lg font-semibold text-gray-600 mb-8">
              Start your first masterpiece ✨
            </p>
            <button
              onClick={() => { void handleCreateBoard(); }}
              disabled={creating}
              className="crayon-btn crayon-btn-red text-lg px-8 py-3"
            >
              {creating ? "Creating... 🖍️" : "Create your first board 🎨"}
            </button>
            {error && (
              <p
                className="mt-4 text-sm font-bold px-4 py-2 rounded-xl inline-block"
                style={{ background: "#fff5f5", border: "2px solid var(--crayon-red)", color: "var(--crayon-red)" }}
              >
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-sketch text-3xl font-bold" style={{ color: "var(--crayon-purple)" }}>
                Your boards 🖍️
              </h2>
              <button
                onClick={() => { void handleCreateBoard(); }}
                disabled={creating}
                className="crayon-btn crayon-btn-green text-sm"
              >
                {creating ? "Creating... 🖍️" : "+ New Board 🎨"}
              </button>
            </div>

            {error && (
              <p
                className="mb-4 text-sm font-bold px-4 py-2 rounded-xl"
                style={{ background: "#fff5f5", border: "2px solid var(--crayon-red)", color: "var(--crayon-red)" }}
              >
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board, i) => {
                const palette = CARD_COLORS[i % CARD_COLORS.length];
                return (
                  <Link
                    key={board.id}
                    href={`/board/${board.id}`}
                    className="block p-6 rounded-2xl transition-all hover:-translate-y-1 hover:scale-[1.02]"
                    style={{
                      background: palette.bg,
                      border: `3px solid ${palette.border}`,
                      boxShadow: `4px 4px 0 ${palette.shadow}`,
                    }}
                  >
                    <h2
                      className="font-sketch text-xl font-bold mb-2 truncate"
                      style={{ color: palette.border }}
                    >
                      {palette.emoji} {board.title || "Untitled Board"}
                    </h2>
                    <p className="text-sm font-semibold text-gray-500">
                      {board.created_at
                        ? new Date(board.created_at).toLocaleDateString()
                        : ""}
                    </p>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
