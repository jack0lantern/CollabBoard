import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";

// We need to test the context provider exports

const { useBoardContext, RealtimeBoardProvider } = await import(
  "@/components/providers/RealtimeBoardProvider"
);

describe("RealtimeBoardProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
