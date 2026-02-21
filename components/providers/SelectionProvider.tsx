"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export interface SelectionContextValue {
  selectedIds: string[];
  select: (id: string) => void;
  toggle: (id: string) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  setSelection: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
}

export const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const select = useCallback((id: string) => {
    setSelectedIds([id]);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const addToSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }, []);

  const removeFromSelection = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const setSelection = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  const value = useMemo<SelectionContextValue>(
    () => ({
      selectedIds,
      select,
      toggle,
      addToSelection,
      removeFromSelection,
      clearSelection,
      setSelection,
      isSelected,
    }),
    [
      selectedIds,
      select,
      toggle,
      addToSelection,
      removeFromSelection,
      clearSelection,
      setSelection,
      isSelected,
    ]
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelectionContext() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelectionContext must be used within SelectionProvider");
  }
  return ctx;
}
