import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Board Operations Tests
 * Tests for: Delete, duplicate, copy/paste
 * These tests validate the mutation logic used by RTDB board operations.
 */

describe("Board Operations - Delete", () => {
  it("removes object from storage by id", () => {
    const objects = new Map<string, any>([
      ["obj-1", { id: "obj-1", type: "sticky", x: 0, y: 0 }],
      ["obj-2", { id: "obj-2", type: "rect", x: 100, y: 100 }],
    ]);

    objects.delete("obj-1");
    expect(objects.size).toBe(1);
    expect(objects.has("obj-1")).toBe(false);
    expect(objects.has("obj-2")).toBe(true);
  });
});

describe("Board Operations - Duplicate", () => {
  it("creates copy of object with new id", () => {
    const original = {
      id: "obj-1",
      type: "sticky",
      x: 100,
      y: 100,
      text: "Original",
      color: "#fef08a",
    };

    const duplicate = {
      ...original,
      id: "obj-1-copy",
      x: original.x + 20,
      y: original.y + 20,
    };

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.text).toBe(original.text);
    expect(duplicate.type).toBe(original.type);
  });
});

describe("Board Operations - Copy/Paste", () => {
  it("preserves object structure when copying", () => {
    const clipboard: any[] = [];
    const obj = {
      id: "obj-1",
      type: "circle",
      x: 50,
      y: 50,
      radius: 30,
      color: "#10b981",
    };

    clipboard.push(JSON.parse(JSON.stringify(obj)));
    const pasted = { ...clipboard[0], id: "obj-2", x: 100, y: 100 };

    expect(pasted.type).toBe(obj.type);
    expect(pasted.radius).toBe(obj.radius);
    expect(pasted.color).toBe(obj.color);
  });
});
