"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

const STORAGE_KEY = "collabboard-grid-visible";

interface GridContextValue {
  gridVisible: boolean;
  setGridVisible: (visible: boolean) => void;
}

const GridContext = createContext<GridContextValue | null>(null);

function getStoredValue(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "false") return false;
  return true;
}

export function useGrid(): GridContextValue {
  const ctx = useContext(GridContext);
  if (!ctx) {
    return {
      gridVisible: true,
      setGridVisible: () => {},
    };
  }
  return ctx;
}

interface GridProviderProps {
  children: ReactNode;
}

export function GridProvider({ children }: GridProviderProps) {
  const [gridVisible, setGridVisibleState] = useState(getStoredValue);

  const setGridVisible = useCallback((visible: boolean) => {
    setGridVisibleState(visible);
    localStorage.setItem(STORAGE_KEY, String(visible));
  }, []);

  return (
    <GridContext.Provider value={{ gridVisible, setGridVisible }}>
      {children}
    </GridContext.Provider>
  );
}
