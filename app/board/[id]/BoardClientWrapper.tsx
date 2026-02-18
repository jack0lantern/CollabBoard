"use client";

import { RealtimeBoardProvider } from "@/components/providers/RealtimeBoardProvider";
import { BoardObjectsProvider } from "@/components/providers/BoardObjectsProvider";
import { useBoardSync } from "@/hooks/useBoardSync";
import { createSupabaseClient } from "@/lib/supabase/client";
import { ensureAnonymousAuth } from "@/lib/firebase/anonymous-auth";
import { useEffect, useState } from "react";
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
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Anonymous");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabase = createSupabaseClient();
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && !cancelled) {
          const meta = session.user.user_metadata ?? {};
          const name =
            meta.full_name ??
            meta.name ??
            session.user.email ??
            "Anonymous";
          setDisplayName(name);
          setAvatarUrl(meta.avatar_url ?? null);
        }
      }

      const uid = await ensureAnonymousAuth();
      if (!cancelled) {
        setFirebaseUid(uid);
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !firebaseUid) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading board...</p>
      </div>
    );
  }

  return (
    <RealtimeBoardProvider
      boardId={boardId}
      userId={firebaseUid}
      displayName={displayName}
      avatarUrl={avatarUrl}
      initialSnapshot={initialSnapshot}
    >
      <SyncManager />
      <BoardObjectsProvider>{children}</BoardObjectsProvider>
    </RealtimeBoardProvider>
  );
}
