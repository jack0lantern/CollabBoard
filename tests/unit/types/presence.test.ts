import { describe, it, expect } from "vitest";
import type { PresenceData } from "@/types/presence";

describe("PresenceData type", () => {
  it("validates presence with cursor", () => {
    const presence: PresenceData = {
      cursor: { x: 100, y: 200 },
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      lastSeen: Date.now(),
    };
    expect(presence.cursor).toEqual({ x: 100, y: 200 });
    expect(presence.displayName).toBe("Test User");
    expect(presence.avatarUrl).toBe("https://example.com/avatar.png");
    expect(typeof presence.lastSeen).toBe("number");
  });

  it("validates presence with null cursor", () => {
    const presence: PresenceData = {
      cursor: null,
      displayName: "Anonymous",
      avatarUrl: null,
      lastSeen: Date.now(),
    };
    expect(presence.cursor).toBeNull();
    expect(presence.avatarUrl).toBeNull();
  });

  it("validates presence lastSeen is a timestamp", () => {
    const now = Date.now();
    const presence: PresenceData = {
      cursor: null,
      displayName: "User",
      avatarUrl: null,
      lastSeen: now,
    };
    expect(presence.lastSeen).toBe(now);
    expect(presence.lastSeen).toBeGreaterThan(0);
  });
});
