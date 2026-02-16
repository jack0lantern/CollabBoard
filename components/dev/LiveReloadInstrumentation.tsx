"use client";

import { useEffect } from "react";

const RELOAD_LOG_KEY = "collabboard:last-reload";

/**
 * Instruments livereload in development:
 * - Logs HMR (Fast Refresh) events when React components hot-update
 * - Logs full page reloads
 * - Tracks reload timing for debugging
 */
export function LiveReloadInstrumentation() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const now = Date.now();
    const lastReload = sessionStorage.getItem(RELOAD_LOG_KEY);
    const timeSinceLastReload = lastReload ? now - parseInt(lastReload, 10) : null;

    sessionStorage.setItem(RELOAD_LOG_KEY, String(now));

    if (timeSinceLastReload !== null && timeSinceLastReload < 2000) {
      console.log(
        `[LiveReload] 🔄 HMR / Fast Refresh at ${new Date().toISOString()}`
      );
    } else {
      console.log(
        `[LiveReload] 📄 Full page load at ${new Date().toISOString()}` +
          (timeSinceLastReload ? ` (${timeSinceLastReload}ms since last)` : "")
      );
    }

    // Webpack HMR API (used by Next.js) - module may not exist in all bundlers
    const mod = typeof module !== "undefined" ? (module as NodeModule & { hot?: any }) : null;
    const hot = mod?.hot;
    if (hot) {
      hot.addStatusHandler((status: string) => {
        if (status === "apply") {
          console.log("[LiveReload] ⚡ HMR applied");
        }
      });
      hot.addDisposeHandler(() => {
        console.log("[LiveReload] 🔌 HMR disposing (module updating)");
      });
    }

    return () => {
      // Cleanup not needed for logging
    };
  }, []);

  return null;
}
