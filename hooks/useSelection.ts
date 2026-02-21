"use client";

import { useContext } from "react";
import { SelectionContext } from "@/components/providers/SelectionProvider";

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelection must be used within SelectionProvider");
  }
  return ctx;
}
