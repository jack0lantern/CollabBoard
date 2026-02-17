import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ObjectData } from "@/types";

const mockGetBoardObjects = vi.fn();
const mockUpdateBoardSnapshot = vi.fn();

vi.mock("@/lib/firebase/rtdb", () => ({
  getBoardObjects: (...args: unknown[]) => mockGetBoardObjects(...args),
}));

vi.mock("@/lib/firebase/boards", () => ({
  updateBoardSnapshot: (...args: unknown[]) =>
    mockUpdateBoardSnapshot(...args),
}));

const mockBoardId = "board-sync-test";
vi.mock("@/components/providers/RealtimeBoardProvider", () => ({
  useBoardContext: () => ({ boardId: mockBoardId }),
}));

// Must import after mocks
const { useBoardSync } = await import("@/hooks/useBoardSync");

describe("useBoardSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUpdateBoardSnapshot.mockResolvedValue(true);
    mockGetBoardObjects.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not sync immediately on mount when not dirty", () => {
    renderHook(() => useBoardSync());
    expect(mockUpdateBoardSnapshot).not.toHaveBeenCalled();
  });

  it("syncs after interval when dirty flag is set", async () => {
    const objects: Record<string, ObjectData> = {
      "obj-1": { id: "obj-1", type: "sticky", x: 0, y: 0, text: "Test" },
    };
    mockGetBoardObjects.mockResolvedValue(objects);

    const { result } = renderHook(() => useBoardSync());

    act(() => {
      result.current.markDirty();
    });

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockUpdateBoardSnapshot).toHaveBeenCalledWith(mockBoardId, objects);
  });

  it("resets dirty flag after successful sync", async () => {
    mockGetBoardObjects.mockResolvedValue({
      "obj-1": { id: "obj-1", type: "rect", x: 0, y: 0 },
    });

    const { result } = renderHook(() => useBoardSync());

    act(() => {
      result.current.markDirty();
    });

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockUpdateBoardSnapshot).toHaveBeenCalledTimes(1);

    // Another interval should not trigger since dirty was reset
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockUpdateBoardSnapshot).toHaveBeenCalledTimes(1);
  });

  it("provides a flushSync function for unmount", async () => {
    mockGetBoardObjects.mockResolvedValue({
      "obj-1": { id: "obj-1", type: "circle", x: 50, y: 50, radius: 25 },
    });

    const { result } = renderHook(() => useBoardSync());

    act(() => {
      result.current.markDirty();
    });

    await act(async () => {
      await result.current.flushSync();
    });

    expect(mockUpdateBoardSnapshot).toHaveBeenCalledTimes(1);
  });
});
