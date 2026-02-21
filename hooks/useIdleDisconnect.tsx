"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

interface IdleDisconnectContextValue {
  isConnected: boolean;
  justReconnected: boolean;
  dismissReconnected: () => void;
}

const IdleDisconnectContext = createContext<IdleDisconnectContextValue | null>(
  null
);

export function useIdleDisconnect(): IdleDisconnectContextValue {
  const ctx = useContext(IdleDisconnectContext);
  if (!ctx) {
    return {
      isConnected: true,
      justReconnected: false,
      dismissReconnected: () => {},
    };
  }
  return ctx;
}

interface IdleDisconnectProviderProps {
  children: ReactNode;
  readOnly?: boolean;
}

export function IdleDisconnectProvider({
  children,
  readOnly = false,
}: IdleDisconnectProviderProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const wasDisconnectedRef = useRef(false);

  const dismissReconnected = useCallback(() => {
    setJustReconnected(false);
  }, []);

  useEffect(() => {
    if (readOnly) return;

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity);
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) return;

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= IDLE_TIMEOUT_MS && isConnected) {
        wasDisconnectedRef.current = true;
        setIsConnected(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [readOnly, isConnected]);

  useEffect(() => {
    if (readOnly) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && wasDisconnectedRef.current) {
        lastActivityRef.current = Date.now();
        wasDisconnectedRef.current = false;
        setIsConnected(true);
        setJustReconnected(true);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [readOnly]);

  const value: IdleDisconnectContextValue = {
    isConnected,
    justReconnected,
    dismissReconnected,
  };

  return (
    <IdleDisconnectContext.Provider value={value}>
      {children}
    </IdleDisconnectContext.Provider>
  );
}
