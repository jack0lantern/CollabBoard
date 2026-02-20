"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface Viewport {
  position: { x: number; y: number };
  scale: number;
  dimensions: { width: number; height: number };
}

const defaultViewport: Viewport = {
  position: { x: 0, y: 0 },
  scale: 1,
  dimensions: { width: 800, height: 600 },
};

interface ViewportContextValue {
  viewport: Viewport;
  setViewport: (v: Viewport) => void;
}

const ViewportContext = createContext<ViewportContextValue | null>(null);

export function useViewport(): Viewport {
  const ctx = useContext(ViewportContext);
  return ctx?.viewport ?? defaultViewport;
}

export function useSetViewport(): (v: Viewport) => void {
  const ctx = useContext(ViewportContext);
  return ctx?.setViewport ?? (() => {});
}

interface ViewportProviderProps {
  children: ReactNode;
}

export function ViewportProvider({ children }: ViewportProviderProps) {
  const [viewport, setViewportState] = useState<Viewport>(defaultViewport);
  const setViewport = useCallback((v: Viewport) => {
    setViewportState(v);
  }, []);

  return (
    <ViewportContext.Provider value={{ viewport, setViewport }}>
      {children}
    </ViewportContext.Provider>
  );
}
