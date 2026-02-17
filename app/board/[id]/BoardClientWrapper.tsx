"use client";

import { RealtimeBoardProvider } from "@/components/providers/RealtimeBoardProvider";
import { useBoardSync } from "@/hooks/useBoardSync";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import type { ObjectData } from "@/types";

function SyncManager() {
  useBoardSync();
  return null;
}

function buildDisplayName(meta: Record<string, unknown>, email: string | undefined): string {
  const first = (meta.first_name as string) ?? (meta.given_name as string) ?? null;
  const last = (meta.last_name as string) ?? (meta.family_name as string) ?? null;
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return (meta.full_name as string) ?? (meta.name as string) ?? email ?? "Anonymous";
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
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const anonIdRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    function handleUser(session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) {
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        setUser({
          id: session.user.id,
          displayName: buildDisplayName(meta, session.user.email),
          avatarUrl:
            (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session);
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

  const userId = user?.id ?? anonIdRef.current;
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
