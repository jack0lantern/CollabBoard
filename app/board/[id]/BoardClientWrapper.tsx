"use client";

import { RealtimeBoardProvider } from "@/components/providers/RealtimeBoardProvider";
import { useBoardSync } from "@/hooks/useBoardSync";
import { createSupabaseClient } from "@/lib/supabase/client";
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
  const [user, setUser] = useState<{
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        setUser({
          id: session.user.id,
          displayName:
            (meta.full_name as string) ??
            (meta.name as string) ??
            session.user.email ??
            null,
          avatarUrl:
            (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        setUser({
          id: session.user.id,
          displayName:
            (meta.full_name as string) ??
            (meta.name as string) ??
            session.user.email ??
            null,
          avatarUrl:
            (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading board...</p>
      </div>
    );
  }

  const userId = user?.id ?? "anonymous";
  const displayName = user?.displayName ?? "Anonymous";
  const avatarUrl = user?.avatarUrl ?? null;

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
