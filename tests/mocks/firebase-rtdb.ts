import { vi } from "vitest";
import type { ObjectData } from "@/types";
import type { PresenceData } from "@/types/presence";

type ChildCallback = (snapshot: { key: string | null; val: () => unknown }) => void;
type ValueCallback = (snapshot: { val: () => unknown }) => void;

interface MockRTDBState {
  objects: Record<string, ObjectData>;
  presence: Record<string, PresenceData>;
  childListeners: {
    added: ChildCallback[];
    changed: ChildCallback[];
    removed: ChildCallback[];
  };
  presenceListeners: ValueCallback[];
}

export function createMockRTDB() {
  const state: MockRTDBState = {
    objects: {},
    presence: {},
    childListeners: { added: [], changed: [], removed: [] },
    presenceListeners: [],
  };

  function notifyPresenceListeners() {
    state.presenceListeners.forEach((cb) => {
      cb({ val: () => ({ ...state.presence }) });
    });
  }

  function makeSnapshot(key: string, data: unknown) {
    return { key, val: () => data };
  }

  const mock = {
    state,

    simulateObjectAdded(id: string, data: ObjectData) {
      state.objects[id] = data;
      state.childListeners.added.forEach((cb) => cb(makeSnapshot(id, data)));
    },

    simulateObjectChanged(id: string, data: ObjectData) {
      state.objects[id] = data;
      state.childListeners.changed.forEach((cb) => cb(makeSnapshot(id, data)));
    },

    simulateObjectRemoved(id: string) {
      delete state.objects[id];
      state.childListeners.removed.forEach((cb) =>
        cb(makeSnapshot(id, null))
      );
    },

    simulatePresenceUpdate(userId: string, presence: PresenceData) {
      state.presence[userId] = presence;
      notifyPresenceListeners();
    },

    simulatePresenceRemoved(userId: string) {
      delete state.presence[userId];
      notifyPresenceListeners();
    },

    onChildAdded(cb: ChildCallback) {
      state.childListeners.added.push(cb);
      Object.entries(state.objects).forEach(([id, data]) => {
        cb(makeSnapshot(id, data));
      });
      return () => {
        const idx = state.childListeners.added.indexOf(cb);
        if (idx !== -1) state.childListeners.added.splice(idx, 1);
      };
    },

    onChildChanged(cb: ChildCallback) {
      state.childListeners.changed.push(cb);
      return () => {
        const idx = state.childListeners.changed.indexOf(cb);
        if (idx !== -1) state.childListeners.changed.splice(idx, 1);
      };
    },

    onChildRemoved(cb: ChildCallback) {
      state.childListeners.removed.push(cb);
      return () => {
        const idx = state.childListeners.removed.indexOf(cb);
        if (idx !== -1) state.childListeners.removed.splice(idx, 1);
      };
    },

    onPresenceValue(cb: ValueCallback) {
      state.presenceListeners.push(cb);
      cb({ val: () => ({ ...state.presence }) });
      return () => {
        const idx = state.presenceListeners.indexOf(cb);
        if (idx !== -1) state.presenceListeners.splice(idx, 1);
      };
    },

    reset() {
      state.objects = {};
      state.presence = {};
      state.childListeners = { added: [], changed: [], removed: [] };
      state.presenceListeners = [];
    },
  };

  return mock;
}

export function createFirebaseDatabaseMock() {
  const mockDb = createMockRTDB();

  const setBoardObject = vi.fn(
    async (_boardId: string, object: ObjectData) => {
      mockDb.simulateObjectAdded(object.id, object);
    }
  );

  const updateBoardObject = vi.fn(
    async (_boardId: string, objectId: string, updates: Partial<ObjectData>) => {
      const existing = mockDb.state.objects[objectId];
      if (existing) {
        const updated = { ...existing, ...updates };
        mockDb.simulateObjectChanged(objectId, updated);
      }
    }
  );

  const removeBoardObject = vi.fn(
    async (_boardId: string, objectId: string) => {
      mockDb.simulateObjectRemoved(objectId);
    }
  );

  const getBoardObjects = vi.fn(async () => {
    return { ...mockDb.state.objects };
  });

  const seedBoardObjects = vi.fn(
    async (_boardId: string, objects: Record<string, ObjectData>) => {
      Object.entries(objects).forEach(([id, data]) => {
        mockDb.simulateObjectAdded(id, data);
      });
    }
  );

  const setPresence = vi.fn(
    async (_boardId: string, userId: string, presence: PresenceData) => {
      mockDb.simulatePresenceUpdate(userId, presence);
    }
  );

  const updatePresenceCursor = vi.fn(
    async (
      _boardId: string,
      userId: string,
      cursor: { x: number; y: number } | null
    ) => {
      const existing = mockDb.state.presence[userId];
      if (existing) {
        mockDb.simulatePresenceUpdate(userId, {
          ...existing,
          cursor,
          lastSeen: Date.now(),
        });
      }
    }
  );

  const removePresence = vi.fn(
    async (_boardId: string, userId: string) => {
      mockDb.simulatePresenceRemoved(userId);
    }
  );

  return {
    mockDb,
    setBoardObject,
    updateBoardObject,
    removeBoardObject,
    getBoardObjects,
    seedBoardObjects,
    setPresence,
    updatePresenceCursor,
    removePresence,
  };
}

export type MockRTDB = ReturnType<typeof createMockRTDB>;
export type FirebaseDatabaseMock = ReturnType<typeof createFirebaseDatabaseMock>;
