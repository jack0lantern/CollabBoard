"use client";

import { RealtimeBoardProvider } from "@/components/providers/RealtimeBoardProvider";
import { BoardObjectsProvider } from "@/components/providers/BoardObjectsProvider";
import { GridProvider } from "@/components/providers/GridProvider";
import { createSupabaseClient } from "@/lib/supabase/client";
import { ensureAnonymousAuth } from "@/lib/firebase/anonymous-auth";
import { useEffect, useState } from "react";

export function BoardClientWrapper({
  boardId,
  children,
}: {
  boardId: string;
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
          const meta = (session.user.user_metadata ?? {}) as Record<
            string,
            unknown
          >;
          const name =
            (meta.full_name as string | undefined) ??
            (meta.name as string | undefined) ??
            session.user.email ??
            "Anonymous";
          setDisplayName(name);
          setAvatarUrl((meta.avatar_url as string | null | undefined) ?? null);
        }
      }

      const uid = await ensureAnonymousAuth();
      if (!cancelled) {
        setFirebaseUid(uid);
        setLoading(false);
      }
    }

    void init();

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
    >
      <GridProvider>
        <BoardObjectsProvider>{children}</BoardObjectsProvider>
      </GridProvider>
    </RealtimeBoardProvider>
  );
}
