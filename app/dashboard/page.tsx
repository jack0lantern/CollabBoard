"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createBoard,
  subscribeToBoardsByOwner,
} from "@/lib/firebase/boards";
import type { Board } from "@/types";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }
      setUser(firebaseUser);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToBoardsByOwner(user.uid, (newBoards) => {
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
      const board = await createBoard("Untitled Board", user.uid);
      if (board) {
        router.push(`/board/${board.id}`);
      } else {
        setError("Failed to create board");
      }
    } catch (err) {
      setError((err as Error)?.message ?? "Network error");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">My Boards</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {user?.email}
            </span>
            <button
              onClick={async () => {
                const auth = getFirebaseAuth();
                if (auth) {
                  await auth.signOut();
                  router.replace("/login");
                }
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {boards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You don&apos;t have any boards yet.
            </p>
            <button
              onClick={handleCreateBoard}
              disabled={creating}
              className="px-6 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create your first board"}
            </button>
            {error && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-6">
              <button
                onClick={handleCreateBoard}
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating..." : "+ New Board"}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className="block p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
                >
                  <h2 className="font-semibold mb-2 truncate">
                    {board.title || "Untitled Board"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {board.created_at
                      ? new Date(board.created_at).toLocaleDateString()
                      : ""}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
