"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

function buildDisplayName(meta: Record<string, unknown>, email: string | undefined): string | null {
  const first = (meta.first_name as string) ?? (meta.given_name as string) ?? null;
  const last = (meta.last_name as string) ?? (meta.family_name as string) ?? null;
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return (meta.full_name as string) ?? (meta.name as string) ?? email ?? null;
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    firstName: (meta.first_name as string) ?? (meta.given_name as string) ?? null,
    lastName: (meta.last_name as string) ?? (meta.family_name as string) ?? null,
    displayName: buildDisplayName(meta, user.email),
    avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
  };
}

export function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setUser(null);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user ?? null));
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(toAuthUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
