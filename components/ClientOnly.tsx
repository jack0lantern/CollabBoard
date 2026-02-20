"use client";

import { useSyncExternalStore } from "react";

/**
 * Renders children only after the component has mounted on the client.
 * Use for content that depends on browser APIs (auth, localStorage, etc.)
 * to avoid server/client hydration mismatches.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
