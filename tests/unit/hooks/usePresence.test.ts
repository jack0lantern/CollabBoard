import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePresence } from "@/hooks/usePresence";
import type { PresenceData } from "@/types/presence";

const mockOnPresenceChange = vi.fn();
const mockSetPresence = vi.fn();
const mockUpdatePresenceCursor = vi.fn();
const mockRemovePresence = vi.fn();
const mockSetupOnDisconnectCleanup = vi.fn();

vi.mock("@/lib/firebase/boards", () => ({
  onPresenceChange: (...args: unknown[]) => mockOnPresenceChange(...args),
  setPresence: (...args: unknown[]) => mockSetPresence(...args),
  updatePresenceCursor: (...args: unknown[]) => mockUpdatePresenceCursor(...args),
  removePresence: (...args: unknown[]) => mockRemovePresence(...args),
  setupOnDisconnectCleanup: (...args: unknown[]) => mockSetupOnDisconnectCleanup(...args),
}));

const mockBoardId = "board-789";
const mockUserId = "user-1";
vi.mock("@/components/providers/RealtimeBoardProvider", () => ({
  useBoardContext: () => ({
    boardId: mockBoardId,
    userId: mockUserId,
    displayName: "Test User",
    avatarUrl: null,
  }),
}));

describe("usePresence", () => {
  let presenceCallback: (presence: Record<string, PresenceData>) => void;
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribe = vi.fn();
    mockSetPresence.mockResolvedValue(undefined);
    mockUpdatePresenceCursor.mockResolvedValue(undefined);
    mockRemovePresence.mockResolvedValue(undefined);

    mockOnPresenceChange.mockImplementation(
      (_boardId: string, callback: typeof presenceCallback) => {
        presenceCallback = callback;
        return unsubscribe;
      }
    );
  });

  it("returns empty others array initially", () => {
    const { result } = renderHook(() => usePresence());
    expect(result.current.others).toEqual([]);
  });

  it("sets own presence on mount", () => {
    renderHook(() => usePresence());
    expect(mockSetPresence).toHaveBeenCalledWith(
      mockBoardId,
      mockUserId,
      expect.objectContaining({
        displayName: "Test User",
        avatarUrl: null,
        cursor: null,
      })
    );
  });

  it("sets up onDisconnect cleanup on mount", () => {
    renderHook(() => usePresence());
    expect(mockSetupOnDisconnectCleanup).toHaveBeenCalledWith(
      mockBoardId,
      mockUserId
    );
  });

  it("filters out own userId from others", () => {
    const { result } = renderHook(() => usePresence());

    act(() => {
      presenceCallback({
        [mockUserId]: {
          cursor: { x: 10, y: 10 },
          displayName: "Test User",
          avatarUrl: null,
          lastSeen: Date.now(),
        },
        "user-2": {
          cursor: { x: 200, y: 300 },
          displayName: "Other User",
          avatarUrl: "https://example.com/avatar.png",
          lastSeen: Date.now(),
        },
      });
    });

    expect(result.current.others).toHaveLength(1);
    expect(result.current.others[0].userId).toBe("user-2");
    expect(result.current.others[0].displayName).toBe("Other User");
  });

  it("provides updateCursor function", () => {
    const { result } = renderHook(() => usePresence());

    act(() => {
      result.current.updateCursor({ x: 150, y: 250 });
    });

    expect(mockUpdatePresenceCursor).toHaveBeenCalledWith(
      mockBoardId,
      mockUserId,
      { x: 150, y: 250 }
    );
  });

  it("removes presence on unmount", () => {
    const { unmount } = renderHook(() => usePresence());
    unmount();
    expect(mockRemovePresence).toHaveBeenCalledWith(mockBoardId, mockUserId);
  });

  it("unsubscribes from presence listener on unmount", () => {
    const { unmount } = renderHook(() => usePresence());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("filters stale presence (>30s old)", () => {
    const { result } = renderHook(() => usePresence());

    act(() => {
      presenceCallback({
        "user-2": {
          cursor: { x: 100, y: 100 },
          displayName: "Active User",
          avatarUrl: null,
          lastSeen: Date.now(),
        },
        "user-3": {
          cursor: { x: 200, y: 200 },
          displayName: "Stale User",
          avatarUrl: null,
          lastSeen: Date.now() - 60000, // 60 seconds ago
        },
      });
    });

    expect(result.current.others).toHaveLength(1);
    expect(result.current.others[0].userId).toBe("user-2");
  });
});
