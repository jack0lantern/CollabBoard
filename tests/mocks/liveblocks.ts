import { vi } from "vitest";
import type { ObjectData } from "@/types";

export function createMockLiveblocksStorage(objects: Record<string, ObjectData> = {}) {
  const map = new Map<string, ObjectData>(Object.entries(objects));
  return {
    get: (key: string) => {
      if (key === "objects") return map;
      return undefined;
    },
    set: (id: string, data: ObjectData) => map.set(id, data),
    delete: (id: string) => map.delete(id),
    entries: () => map.entries(),
  };
}

export function mockUseStorage(initialObjects: Record<string, ObjectData> = {}) {
  const storage = createMockLiveblocksStorage(initialObjects);
  return vi.fn(() => storage.get("objects"));
}

export function mockUseMutation() {
  return vi.fn((callback: (ctx: any, ...args: any[]) => void) => {
    return (...args: any[]) => {
      const ctx = {
        storage: {
          get: (key: string) => storage.get(key),
        },
      };
      const storage = createMockLiveblocksStorage();
      (ctx.storage as any).get = (key: string) =>
        key === "objects" ? storage : undefined;
      callback(ctx, ...args);
    };
  });
}

export function mockUseOthers(others: Array<{ id: string; presence?: any; info?: any }> = []) {
  return vi.fn(() => others);
}
