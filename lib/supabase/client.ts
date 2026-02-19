import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const client = createBrowserClient(url, anonKey, {
    realtime: {
      // Use Web Worker for heartbeats so they continue when tab is backgrounded
      worker: true,
      // Reconnect when connection drops (e.g. after idle)
      heartbeatCallback: (status) => {
        if (status === "disconnected" || status === "timeout") {
          client.realtime.connect();
        }
      },
    },
  });
  return client;
}
