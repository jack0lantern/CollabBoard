import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { ObjectData } from "@/types";

const mockSetBoardObject = vi.fn();
const mockUpdateBoardObject = vi.fn();
const mockRemoveBoardObject = vi.fn();

vi.mock("@/lib/firebase/boards", () => ({
  setBoardObject: (...args: unknown[]) => mockSetBoardObject(...args),
  updateBoardObject: (...args: unknown[]) => mockUpdateBoardObject(...args),
  removeBoardObject: (...args: unknown[]) => mockRemoveBoardObject(...args),
}));

const mockBoardId = "board-456";
vi.mock("@/components/providers/RealtimeBoardProvider", () => ({
  useBoardContext: () => ({ boardId: mockBoardId }),
}));

describe("useBoardMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetBoardObject.mockResolvedValue(undefined);
    mockUpdateBoardObject.mockResolvedValue(undefined);
    mockRemoveBoardObject.mockResolvedValue(undefined);
  });

  it("returns addObject, updateObject, and deleteObject functions", () => {
    const { result } = renderHook(() => useBoardMutations());
    expect(result.current.addObject).toBeDefined();
    expect(result.current.updateObject).toBeDefined();
    expect(result.current.deleteObject).toBeDefined();
  });

  it("addObject calls setBoardObject with boardId and object", () => {
    const { result } = renderHook(() => useBoardMutations());

    const newObject: ObjectData = {
      id: "obj-new",
      type: "sticky",
      x: 100,
      y: 200,
      text: "Test",
      color: "#fef08a",
    };

    act(() => {
      result.current.addObject(newObject);
    });

    expect(mockSetBoardObject).toHaveBeenCalledWith(mockBoardId, newObject);
  });

  it("updateObject calls updateBoardObject with boardId, id, and partial updates", () => {
    const { result } = renderHook(() => useBoardMutations());

    act(() => {
      result.current.updateObject("obj-1", { x: 50, y: 75 });
    });

    expect(mockUpdateBoardObject).toHaveBeenCalledWith(mockBoardId, "obj-1", {
      x: 50,
      y: 75,
    });
  });

  it("deleteObject calls removeBoardObject with boardId and id", () => {
    const { result } = renderHook(() => useBoardMutations());

    act(() => {
      result.current.deleteObject("obj-1");
    });

    expect(mockRemoveBoardObject).toHaveBeenCalledWith(mockBoardId, "obj-1");
  });

  it("addObject passes full ObjectData including optional fields", () => {
    const { result } = renderHook(() => useBoardMutations());

    const circle: ObjectData = {
      id: "circle-1",
      type: "circle",
      x: 200,
      y: 200,
      radius: 50,
      color: "#10b981",
      rotation: 45,
    };

    act(() => {
      result.current.addObject(circle);
    });

    expect(mockSetBoardObject).toHaveBeenCalledWith(mockBoardId, circle);
  });
});
