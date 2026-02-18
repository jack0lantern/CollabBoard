import { describe, it, expect } from "vitest";
import {
  boundBoxWithAnchorPreservation,
  getObjectBoundingBox,
  computeGroupBoundingBox,
  isFullyContained,
  rectsIntersect,
} from "@/lib/utils/boundingBox";

describe("boundBoxWithAnchorPreservation", () => {
  const anchor = { x: 100, y: 100, width: 80, height: 60, rotation: 0 };
  const minW = 20;
  const minH = 20;

  it("passes through when size is above minimum", () => {
    const newBox = { x: 100, y: 100, width: 100, height: 80, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      anchor,
      newBox,
      minW,
      minH,
      anchor
    );
    expect(result).toEqual(newBox);
  });

  it("clamps width when too small, anchors right edge when left handle dragged", () => {
    const newBox = { x: 150, y: 100, width: 10, height: 60, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      anchor,
      newBox,
      minW,
      minH,
      anchor
    );
    expect(result.width).toBe(20);
    expect(result.x + result.width).toBe(anchor.x + anchor.width);
    expect(result.height).toBe(60);
  });

  it("clamps width when too small, anchors left edge when right handle dragged", () => {
    const newBox = { x: 100, y: 100, width: 10, height: 60, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      anchor,
      newBox,
      minW,
      minH,
      anchor
    );
    expect(result.width).toBe(20);
    expect(result.x).toBe(anchor.x);
    expect(result.height).toBe(60);
  });

  it("clamps negative width (flip) and anchors correctly", () => {
    const newBox = { x: 100, y: 100, width: -10, height: 60, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      anchor,
      newBox,
      minW,
      minH,
      anchor
    );
    expect(result.width).toBe(-20);
    expect(Math.abs(result.width)).toBe(20);
  });

  it("clamps height when too small", () => {
    const newBox = { x: 100, y: 100, width: 80, height: 5, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      anchor,
      newBox,
      minW,
      minH,
      anchor
    );
    expect(result.height).toBe(20);
    expect(result.width).toBe(80);
  });

  it("uses oldBox when anchorBox is null", () => {
    const oldBox = { x: 50, y: 50, width: 100, height: 80, rotation: 0 };
    const newBox = { x: 50, y: 50, width: 5, height: 80, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      oldBox,
      newBox,
      minW,
      minH,
      null
    );
    expect(result.width).toBe(20);
  });
});

describe("getObjectBoundingBox", () => {
  it("returns rect box for rect type", () => {
    const box = getObjectBoundingBox({
      id: "r1",
      type: "rect",
      x: 10,
      y: 20,
      width: 50,
      height: 40,
    });
    expect(box).toEqual({ x: 10, y: 20, width: 50, height: 40 });
  });

  it("returns circle box for circle type", () => {
    const box = getObjectBoundingBox({
      id: "c1",
      type: "circle",
      x: 100,
      y: 100,
      radius: 30,
    });
    expect(box).toEqual({ x: 70, y: 70, width: 60, height: 60 });
  });
});

describe("computeGroupBoundingBox", () => {
  it("returns zero box for empty array", () => {
    expect(computeGroupBoundingBox([])).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});

describe("isFullyContained", () => {
  it("returns true when a is inside b", () => {
    expect(
      isFullyContained(
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 0, y: 0, width: 50, height: 50 }
      )
    ).toBe(true);
  });

  it("returns false when a extends outside b", () => {
    expect(
      isFullyContained(
        { x: 10, y: 10, width: 50, height: 20 },
        { x: 0, y: 0, width: 50, height: 50 }
      )
    ).toBe(false);
  });
});

describe("rectsIntersect", () => {
  it("returns true when rects overlap", () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 }
      )
    ).toBe(true);
  });

  it("returns false when rects do not overlap", () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 }
      )
    ).toBe(false);
  });
});
