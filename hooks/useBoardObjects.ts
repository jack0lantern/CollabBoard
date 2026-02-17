"use client";

import { useEffect, useState } from "react";
import { onBoardObjectsChange } from "@/lib/supabase/boards";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";
import type { ObjectData } from "@/types";

export function useBoardObjects(): Record<string, ObjectData> {
  const { boardId } = useBoardContext();
  const [objects, setObjects] = useState<Record<string, ObjectData>>({});

  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = onBoardObjectsChange(boardId, {
      onAdded(id, data) {
        setObjects((prev) => ({ ...prev, [id]: data }));
      },
      onChanged(id, data) {
        setObjects((prev) => ({ ...prev, [id]: data }));
      },
      onRemoved(id) {
        setObjects((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      },
    });

    return unsubscribe;
  }, [boardId]);

  return objects;
}
