"use client";

import { useStorage, useMutation } from "./client";
import type { ObjectData } from "@/types";

export function useBoardState() {
  const objects = useStorage((root) => root.objects);
  if (!objects) return {} as Record<string, ObjectData>;
  const obj = objects as unknown;
  const entries =
    obj instanceof Map
      ? Array.from(obj.entries())
      : Object.entries(obj as Record<string, ObjectData>);
  return Object.fromEntries(entries) as Record<string, ObjectData>;
}

export function useAddObject() {
  return useMutation(({ storage }, object: ObjectData) => {
    const objects = storage.get("objects") as { set: (k: string, v: unknown) => void } | undefined;
    if (objects) objects.set(object.id, object);
  }, []);
}

export function useUpdateObject() {
  return useMutation(({ storage }, id: string, updates: Partial<ObjectData>) => {
    const objects = storage.get("objects") as { get: (k: string) => unknown } | undefined;
    if (objects) {
      const existing = objects.get(id) as ObjectData | undefined;
      if (existing) {
        Object.assign(existing, updates);
      }
    }
  }, []);
}

export function useDeleteObject() {
  return useMutation(({ storage }, id: string) => {
    const objects = storage.get("objects") as { delete: (k: string) => void } | undefined;
    if (objects) objects.delete(id);
  }, []);
}
