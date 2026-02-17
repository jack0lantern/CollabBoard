"use client";

import { RealtimeBoardProvider } from "@/components/providers/RealtimeBoardProvider";
import { useBoardSync } from "@/hooks/useBoardSync";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { ObjectData } from "@/types";

function SyncManager() {
  useBoardSync();
  return null;
}

export function BoardClientWrapper({
  boardId,
  initialSnapshot,
  children,
}: {
  boardId: string;
  initialSnapshot: Record<string, ObjectData> | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{
    uid: string;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading board...</p>
      </div>
    );
  }

  const userId = user?.uid ?? "anonymous";
  const displayName = user?.displayName ?? "Anonymous";
  const avatarUrl = user?.photoURL ?? null;

  return (
    <RealtimeBoardProvider
      boardId={boardId}
      userId={userId}
      displayName={displayName}
      avatarUrl={avatarUrl}
      initialSnapshot={initialSnapshot}
    >
      <SyncManager />
      {children}
    </RealtimeBoardProvider>
  );
}
