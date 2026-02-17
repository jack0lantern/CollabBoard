import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { useBoardObjects } from "@/hooks/useBoardObjects";
import type { ObjectData } from "@/types";

// Mock the Firestore boards module
const mockOnBoardObjectsChange = vi.fn();

vi.mock("@/lib/supabase/boards", () => ({
  onBoardObjectsChange: (...args: unknown[]) => mockOnBoardObjectsChange(...args),
}));

// Mock the BoardContext
const mockBoardId = "board-123";
vi.mock("@/components/providers/RealtimeBoardProvider", () => ({
  useBoardContext: () => ({ boardId: mockBoardId }),
}));

describe("useBoardObjects", () => {
  let capturedCallbacks: {
    onAdded: (id: string, data: ObjectData) => void;
    onChanged: (id: string, data: ObjectData) => void;
    onRemoved: (id: string) => void;
  };
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribe = vi.fn();
    mockOnBoardObjectsChange.mockImplementation(
      (_boardId: string, callbacks: typeof capturedCallbacks) => {
        capturedCallbacks = callbacks;
        return unsubscribe;
      }
    );
  });

  it("returns empty record initially", () => {
    const { result } = renderHook(() => useBoardObjects());
    expect(result.current).toEqual({});
  });

  it("adds objects when onChildAdded fires", () => {
    const { result } = renderHook(() => useBoardObjects());

    const sticky: ObjectData = {
      id: "obj-1",
      type: "sticky",
      x: 100,
      y: 100,
      text: "Hello",
    };

    act(() => {
      capturedCallbacks.onAdded("obj-1", sticky);
    });

    expect(result.current["obj-1"]).toEqual(sticky);
  });

  it("updates objects when onChildChanged fires", () => {
    const { result } = renderHook(() => useBoardObjects());

    const original: ObjectData = {
      id: "obj-1",
      type: "rect",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    };

    act(() => {
      capturedCallbacks.onAdded("obj-1", original);
    });

    const updated: ObjectData = { ...original, x: 50, y: 50 };

    act(() => {
      capturedCallbacks.onChanged("obj-1", updated);
    });

    expect(result.current["obj-1"].x).toBe(50);
    expect(result.current["obj-1"].y).toBe(50);
  });

  it("removes objects when onChildRemoved fires", () => {
    const { result } = renderHook(() => useBoardObjects());

    act(() => {
      capturedCallbacks.onAdded("obj-1", {
        id: "obj-1",
        type: "circle",
        x: 0,
        y: 0,
        radius: 30,
      });
      capturedCallbacks.onAdded("obj-2", {
        id: "obj-2",
        type: "rect",
        x: 100,
        y: 100,
      });
    });

    expect(Object.keys(result.current)).toHaveLength(2);

    act(() => {
      capturedCallbacks.onRemoved("obj-1");
    });

    expect(Object.keys(result.current)).toHaveLength(1);
    expect(result.current["obj-1"]).toBeUndefined();
    expect(result.current["obj-2"]).toBeDefined();
  });

  it("subscribes with the correct boardId", () => {
    renderHook(() => useBoardObjects());
    expect(mockOnBoardObjectsChange).toHaveBeenCalledWith(
      mockBoardId,
      expect.any(Object)
    );
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useBoardObjects());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("handles multiple objects concurrently", () => {
    const { result } = renderHook(() => useBoardObjects());

    act(() => {
      for (let i = 0; i < 10; i++) {
        capturedCallbacks.onAdded(`obj-${i}`, {
          id: `obj-${i}`,
          type: "sticky",
          x: i * 100,
          y: i * 50,
        });
      }
    });

    expect(Object.keys(result.current)).toHaveLength(10);
  });
});
