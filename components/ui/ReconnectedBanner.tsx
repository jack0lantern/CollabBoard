"use client";

import { useEffect } from "react";
import { useIdleDisconnect } from "@/hooks/useIdleDisconnect";

const AUTO_DISMISS_MS = 5000;

export function ReconnectedBanner() {
  const { justReconnected, dismissReconnected } = useIdleDisconnect();

  useEffect(() => {
    if (!justReconnected) return;
    const timer = setTimeout(dismissReconnected, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [justReconnected, dismissReconnected]);

  if (!justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-opacity duration-300"
      style={{
        background: "var(--crayon-blue)",
        color: "white",
        fontSize: "0.875rem",
        fontWeight: 600,
      }}
    >
      <span aria-hidden>✓</span>
      <span>You&apos;ve been reconnected</span>
    </div>
  );
}
