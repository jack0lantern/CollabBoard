import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";

// We need to test the context provider exports
const mockGetBoardObjects = vi.fn();
const mockSeedBoardObjects = vi.fn();

vi.mock("@/lib/supabase/boards", () => ({
  getBoardObjects: (...args: unknown[]) => mockGetBoardObjects(...args),
  seedBoardObjects: (...args: unknown[]) => mockSeedBoardObjects(...args),
}));

const { useBoardContext, RealtimeBoardProvider } = await import(
  "@/components/providers/RealtimeBoardProvider"
);

describe("RealtimeBoardProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBoardObjects.mockResolvedValue({});
    mockSeedBoardObjects.mockResolvedValue(undefined);
  });

  it("provides boardId through context", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        RealtimeBoardProvider,
        {
          boardId: "test-board",
          userId: "user-1",
          displayName: "Test User",
          avatarUrl: null,
          initialSnapshot: null,
        },
        children
      );

    const { result } = renderHook(() => useBoardContext(), { wrapper });
    expect(result.current.boardId).toBe("test-board");
  });

  it("provides userId through context", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        RealtimeBoardProvider,
        {
          boardId: "test-board",
          userId: "user-1",
          displayName: "Test User",
          avatarUrl: null,
          initialSnapshot: null,
        },
        children
      );

    const { result } = renderHook(() => useBoardContext(), { wrapper });
    expect(result.current.userId).toBe("user-1");
  });

  it("provides displayName through context", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        RealtimeBoardProvider,
        {
          boardId: "test-board",
          userId: "user-1",
          displayName: "Jane Doe",
          avatarUrl: "https://example.com/avatar.png",
          initialSnapshot: null,
        },
        children
      );

    const { result } = renderHook(() => useBoardContext(), { wrapper });
    expect(result.current.displayName).toBe("Jane Doe");
    expect(result.current.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("throws error when useBoardContext is used outside provider", () => {
    expect(() => {
      renderHook(() => useBoardContext());
    }).toThrow();
  });
});
