"use client";

import { useEffect, useState } from "react";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
