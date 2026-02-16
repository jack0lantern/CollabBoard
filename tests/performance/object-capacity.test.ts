import { describe, it, expect } from "vitest";
import type { ObjectData } from "@/types";

/**
 * Performance: Object Capacity
 * Target: 500+ objects without performance drops
 * This test validates that we can create and process 500+ objects in memory.
 * Actual render performance requires E2E or manual verification.
 */

function createObject(id: number): ObjectData {
  return {
    id: `obj-${id}`,
    type: "sticky",
    x: (id % 20) * 100,
    y: Math.floor(id / 20) * 100,
    width: 200,
    height: 150,
    text: `Note ${id}`,
    color: "#fef08a",
  };
}

describe("Object Capacity", () => {
  it("handles 500+ objects in memory", () => {
    const objects: Record<string, ObjectData> = {};
    for (let i = 0; i < 500; i++) {
      const obj = createObject(i);
      objects[obj.id] = obj;
    }
    expect(Object.keys(objects).length).toBe(500);
  });

  it("handles 1000 objects for stress test", () => {
    const objects: Record<string, ObjectData> = {};
    for (let i = 0; i < 1000; i++) {
      objects[`obj-${i}`] = createObject(i);
    }
    expect(Object.keys(objects).length).toBe(1000);
  });
});
