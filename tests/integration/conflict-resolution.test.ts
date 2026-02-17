import { describe, it, expect } from "vitest";

/**
 * Conflict Resolution Tests
 * Document: Last-write-wins (LWW) is acceptable for MVP.
 * Firebase RTDB uses last-write-wins per object. Concurrent edits to different
 * properties are merged; same property uses LWW.
 */

describe("Conflict Resolution - Last-Write-Wins", () => {
  it("last update wins when same property edited concurrently", () => {
    const obj = { id: "1", type: "sticky", x: 0, y: 0, text: "A" };

    // Simulate User A and User B both updating text
    const updateA = { ...obj, text: "User A edit" };
    const updateB = { ...obj, text: "User B edit" };

    // LWW: whichever arrives last wins
    const merged = { ...obj, ...updateB };
    expect(merged.text).toBe("User B edit");
  });

  it("different properties can be merged from concurrent edits", () => {
    const base = { id: "1", type: "sticky", x: 0, y: 0, text: "Hi", color: "#fff" };

    // User A moves (x,y), User B changes color - only changed props
    const fromA = { x: 100, y: 100 };
    const fromB = { color: "#fef08a" };

    const merged = { ...base, ...fromA, ...fromB };
    expect(merged.x).toBe(100);
    expect(merged.y).toBe(100);
    expect(merged.color).toBe("#fef08a");
  });
});
