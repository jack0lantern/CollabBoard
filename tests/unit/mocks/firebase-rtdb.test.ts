import { describe, it, expect, beforeEach } from "vitest";
import { createMockRTDB, createFirebaseDatabaseMock } from "@/tests/mocks/firebase-rtdb";
import type { ObjectData } from "@/types";

describe("createMockRTDB", () => {
  let mockDb: ReturnType<typeof createMockRTDB>;

  beforeEach(() => {
    mockDb = createMockRTDB();
  });

  it("starts with empty state", () => {
    expect(Object.keys(mockDb.state.objects)).toHaveLength(0);
    expect(Object.keys(mockDb.state.presence)).toHaveLength(0);
  });

  it("fires onChildAdded for existing objects when listener is registered", () => {
    const obj: ObjectData = { id: "obj-1", type: "sticky", x: 0, y: 0 };
    mockDb.state.objects["obj-1"] = obj;

    const received: ObjectData[] = [];
    mockDb.onChildAdded((snapshot) => {
      received.push(snapshot.val() as ObjectData);
    });

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe("obj-1");
  });

  it("fires onChildAdded when object is simulated added", () => {
    const received: ObjectData[] = [];
    mockDb.onChildAdded((snapshot) => {
      received.push(snapshot.val() as ObjectData);
    });

    mockDb.simulateObjectAdded("obj-1", { id: "obj-1", type: "rect", x: 10, y: 20 });

    expect(received).toHaveLength(1);
    expect(received[0].x).toBe(10);
  });

  it("fires onChildChanged when object is updated", () => {
    const changed: ObjectData[] = [];
    mockDb.onChildChanged((snapshot) => {
      changed.push(snapshot.val() as ObjectData);
    });

    mockDb.simulateObjectChanged("obj-1", { id: "obj-1", type: "circle", x: 50, y: 50, radius: 30 });

    expect(changed).toHaveLength(1);
    expect(changed[0].radius).toBe(30);
  });

  it("fires onChildRemoved when object is removed", () => {
    const removedKeys: string[] = [];
    mockDb.onChildRemoved((snapshot) => {
      if (snapshot.key) removedKeys.push(snapshot.key);
    });

    mockDb.simulateObjectRemoved("obj-1");

    expect(removedKeys).toEqual(["obj-1"]);
  });

  it("fires presence listeners on update", () => {
    const presenceUpdates: Record<string, unknown>[] = [];
    mockDb.onPresenceValue((snapshot) => {
      presenceUpdates.push(snapshot.val() as Record<string, unknown>);
    });

    // Initial call fires immediately
    expect(presenceUpdates).toHaveLength(1);

    mockDb.simulatePresenceUpdate("user-1", {
      cursor: { x: 100, y: 200 },
      displayName: "Test",
      avatarUrl: null,
      lastSeen: Date.now(),
    });

    expect(presenceUpdates).toHaveLength(2);
  });

  it("unsubscribes correctly", () => {
    const received: ObjectData[] = [];
    const unsub = mockDb.onChildAdded((snapshot) => {
      received.push(snapshot.val() as ObjectData);
    });

    unsub();

    mockDb.simulateObjectAdded("obj-1", { id: "obj-1", type: "line", x: 0, y: 0 });

    // Nothing received after unsub
    expect(received).toHaveLength(0);
  });

  it("resets all state", () => {
    mockDb.simulateObjectAdded("obj-1", { id: "obj-1", type: "sticky", x: 0, y: 0 });
    mockDb.simulatePresenceUpdate("user-1", {
      cursor: null,
      displayName: "A",
      avatarUrl: null,
      lastSeen: Date.now(),
    });

    mockDb.reset();

    expect(Object.keys(mockDb.state.objects)).toHaveLength(0);
    expect(Object.keys(mockDb.state.presence)).toHaveLength(0);
  });
});

describe("createFirebaseDatabaseMock", () => {
  it("provides mock functions for all RTDB operations", () => {
    const mock = createFirebaseDatabaseMock();
    expect(mock.setBoardObject).toBeDefined();
    expect(mock.updateBoardObject).toBeDefined();
    expect(mock.removeBoardObject).toBeDefined();
    expect(mock.getBoardObjects).toBeDefined();
    expect(mock.seedBoardObjects).toBeDefined();
    expect(mock.setPresence).toBeDefined();
    expect(mock.updatePresenceCursor).toBeDefined();
    expect(mock.removePresence).toBeDefined();
  });

  it("setBoardObject adds to mock state", async () => {
    const mock = createFirebaseDatabaseMock();
    const obj: ObjectData = { id: "obj-1", type: "sticky", x: 0, y: 0 };
    await mock.setBoardObject("board-1", obj);
    expect(mock.mockDb.state.objects["obj-1"]).toEqual(obj);
  });

  it("removeBoardObject removes from mock state", async () => {
    const mock = createFirebaseDatabaseMock();
    mock.mockDb.state.objects["obj-1"] = { id: "obj-1", type: "sticky", x: 0, y: 0 };
    await mock.removeBoardObject("board-1", "obj-1");
    expect(mock.mockDb.state.objects["obj-1"]).toBeUndefined();
  });
});
