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

function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const firstName = meta.first_name ?? meta.given_name ?? null;
  const lastName = meta.last_name ?? meta.family_name ?? null;
  const displayName =
    meta.full_name ??
    meta.name ??
    ([firstName, lastName].filter(Boolean).join(" ") || user.email) ??
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    firstName,
    lastName,
    displayName,
    avatarUrl: meta.avatar_url ?? null,
  };
}

export function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      queueMicrotask(() => setUser(null));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? toAuthUser(session.user) : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAuthUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
