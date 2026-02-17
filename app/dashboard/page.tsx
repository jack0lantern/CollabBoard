"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import type { Board } from "@/types";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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

    async function fetchBoards() {
      const token = await user?.getIdToken();
      if (!token) return;

      try {
        const res = await fetch("/api/boards", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBoards(data.boards);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBoards();
  }, [user]);

  const handleCreateBoard = async () => {
    if (!user || creating) return;
    setCreating(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Untitled Board" }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/board/${data.board.id}`);
      }
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
