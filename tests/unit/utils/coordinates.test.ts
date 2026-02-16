import { describe, it, expect } from "vitest";
import { screenToBoard, boardToScreen } from "@/lib/utils/coordinates";

function createMockStage(
  inversePoint: (p: { x: number; y: number }) => { x: number; y: number }
) {
  const inverted = { point: inversePoint };
  const transform = {
    copy: () => ({
      invert: () => inverted,
    }),
  };
  return {
    getAbsoluteTransform: () => transform,
  } as any;
}

describe("screenToBoard", () => {
  it("converts screen to board with identity transform", () => {
    const stage = createMockStage((p) => ({ x: p.x, y: p.y }));
    const result = screenToBoard(stage, 100, 200);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("applies inverse transform (scale 2, offset 50)", () => {
    const stage = createMockStage((p) => ({
      x: (p.x - 50) / 2,
      y: (p.y - 50) / 2,
    }));
    const result = screenToBoard(stage, 150, 150);
    expect(result).toEqual({ x: 50, y: 50 });
  });
});

describe("boardToScreen", () => {
  it("converts board to screen coordinates", () => {
    const stage = createMockStage((p) => ({ x: p.x, y: p.y }));
    (stage as any).getAbsoluteTransform = () => ({
      point: (p: { x: number; y: number }) => ({ x: p.x, y: p.y }),
    });
    const result = boardToScreen(stage, 100, 200);
    expect(result).toEqual({ x: 100, y: 200 });
  });
});
