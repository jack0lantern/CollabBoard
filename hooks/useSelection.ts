"use client";

import { useCallback, useState } from "react";

export function useSelection() {
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

  return {
    selectedIds,
    select,
    toggle,
    addToSelection,
    removeFromSelection,
    clearSelection,
    setSelection,
    isSelected,
  };
}
