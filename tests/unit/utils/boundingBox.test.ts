import { describe, it, expect } from "vitest";
import {
  boundBoxWithAnchorPreservation,
  getObjectBoundingBox,
  computeGroupBoundingBox,
  isFullyContained,
  rectsIntersect,
  isLinePartOfFrame,
  getLineEffectiveZIndex,
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

  it("uses activeAnchor for reliable corner detection (top-left drag anchors bottom-right)", () => {
    const newBox = { x: 100, y: 100, width: 5, height: 5, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      anchor,
      newBox,
      minW,
      minH,
      anchor,
      "top-left"
    );
    expect(result.width).toBe(minW);
    expect(result.height).toBe(minH);
    expect(result.x).toBe(anchor.x + anchor.width - minW);
    expect(result.y).toBe(anchor.y + anchor.height - minH);
  });

  it("uses activeAnchor for bottom-right drag (anchors top-left)", () => {
    const newBox = { x: 100, y: 100, width: 5, height: 5, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      anchor,
      newBox,
      minW,
      minH,
      anchor,
      "bottom-right"
    );
    expect(result.width).toBe(minW);
    expect(result.height).toBe(minH);
    expect(result.x).toBe(anchor.x);
    expect(result.y).toBe(anchor.y);
  });

  it("preserves aspect ratio when clamping with preserveAspectRatio (e.g. text)", () => {
    const newBox = { x: 100, y: 100, width: 10, height: 4, rotation: 0 };
    const result = boundBoxWithAnchorPreservation(
      anchor,
      newBox,
      minW,
      minH,
      anchor,
      "bottom-right",
      true
    );
    const scale = Math.max(minW / 10, minH / 4);
    expect(result.width).toBe(10 * scale);
    expect(result.height).toBe(4 * scale);
    expect(result.width / result.height).toBeCloseTo(10 / 4);
    expect(result.x).toBe(anchor.x);
    expect(result.y).toBe(anchor.y);
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

  it("returns frame box for frame type", () => {
    const box = getObjectBoundingBox({
      id: "f1",
      type: "frame",
      x: 50,
      y: 80,
      width: 600,
      height: 400,
    });
    expect(box).toEqual({ x: 50, y: 80, width: 600, height: 400 });
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

describe("isLinePartOfFrame", () => {
  const frameId = "f1";
  const objOnFrame = "s1";
  const objOffFrame = "s2";

  it("returns true when both ends attached to objects on frame", () => {
    const line = {
      id: "l1",
      type: "line" as const,
      x: 0,
      y: 0,
      lineStartConnection: { objectId: objOnFrame, pointIndex: 0 },
      lineEndConnection: { objectId: objOnFrame, pointIndex: 1 },
    };
    const onFrame = new Set([objOnFrame]);
    expect(isLinePartOfFrame(line, frameId, onFrame)).toBe(true);
  });

  it("returns true when one end on frame, other end free", () => {
    const line = {
      id: "l1",
      type: "line" as const,
      x: 0,
      y: 0,
      lineStartConnection: { objectId: objOnFrame, pointIndex: 0 },
    };
    const onFrame = new Set([objOnFrame]);
    expect(isLinePartOfFrame(line, frameId, onFrame)).toBe(true);
  });

  it("returns false when one end on frame, other attached to object off frame", () => {
    const line = {
      id: "l1",
      type: "line" as const,
      x: 0,
      y: 0,
      lineStartConnection: { objectId: objOnFrame, pointIndex: 0 },
      lineEndConnection: { objectId: objOffFrame, pointIndex: 0 },
    };
    const onFrame = new Set([objOnFrame]);
    expect(isLinePartOfFrame(line, frameId, onFrame)).toBe(false);
  });

  it("returns false for non-line object", () => {
    const rect = {
      id: "r1",
      type: "rect" as const,
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    };
    expect(isLinePartOfFrame(rect, frameId, new Set())).toBe(false);
  });
});

describe("getLineEffectiveZIndex", () => {
  it("returns base zIndex when line has no connections", () => {
    const line = {
      id: "l1",
      type: "line" as const,
      x: 0,
      y: 0,
      zIndex: 5,
    };
    expect(getLineEffectiveZIndex(line, [line])).toBe(5);
  });

  it("returns frameZ+1 when line connects to object on frame", () => {
    const frame = {
      id: "f1",
      type: "frame" as const,
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      zIndex: 2,
    };
    const sticky = {
      id: "s1",
      type: "sticky" as const,
      x: 50,
      y: 50,
      width: 100,
      height: 80,
      zIndex: 5,
    };
    const line = {
      id: "l1",
      type: "line" as const,
      x: 0,
      y: 0,
      zIndex: 0,
      lineStartConnection: { objectId: "s1", pointIndex: 0 },
    };
    expect(getLineEffectiveZIndex(line, [frame, sticky, line])).toBe(3);
  });
});
