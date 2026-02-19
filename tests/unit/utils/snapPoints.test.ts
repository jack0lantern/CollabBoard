import { describe, it, expect } from "vitest";
import {
  getObjectSnapPoints,
  getSnapPointForConnection,
  findClosestSnapPoint,
  findClosestSnapPointWithConnection,
} from "@/lib/utils/snapPoints";

describe("getObjectSnapPoints", () => {
  it("returns 4 corners + 4 edges for rect", () => {
    const obj = {
      id: "r1",
      type: "rect" as const,
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    };
    const points = getObjectSnapPoints(obj);
    expect(points).toHaveLength(8);
    expect(points).toContainEqual({ x: 10, y: 20 });
    expect(points).toContainEqual({ x: 110, y: 20 });
    expect(points).toContainEqual({ x: 110, y: 100 });
    expect(points).toContainEqual({ x: 10, y: 100 });
    expect(points).toContainEqual({ x: 60, y: 20 });
    expect(points).toContainEqual({ x: 110, y: 60 });
    expect(points).toContainEqual({ x: 60, y: 100 });
    expect(points).toContainEqual({ x: 10, y: 60 });
  });

  it("returns center + 4 cardinal points for circle", () => {
    const obj = {
      id: "c1",
      type: "circle" as const,
      x: 50,
      y: 50,
      radius: 30,
    };
    const points = getObjectSnapPoints(obj);
    expect(points).toHaveLength(5);
    expect(points).toContainEqual({ x: 50, y: 50 });
    expect(points).toContainEqual({ x: 80, y: 50 });
    expect(points).toContainEqual({ x: 20, y: 50 });
    expect(points).toContainEqual({ x: 50, y: 80 });
    expect(points).toContainEqual({ x: 50, y: 20 });
  });

  it("returns 2 endpoints for line", () => {
    const obj = {
      id: "l1",
      type: "line" as const,
      x: 0,
      y: 0,
      points: [10, 20, 90, 80],
    };
    const points = getObjectSnapPoints(obj);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ x: 10, y: 20 });
    expect(points[1]).toEqual({ x: 90, y: 80 });
  });
});

describe("findClosestSnapPoint", () => {
  const snapPoints = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 50, y: 50 },
  ];

  it("returns snapped position when within threshold", () => {
    const result = findClosestSnapPoint(51, 51, snapPoints, 5);
    expect(result.snapped).toBe(true);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });

  it("returns original position when outside threshold", () => {
    const result = findClosestSnapPoint(70, 70, snapPoints, 5);
    expect(result.snapped).toBe(false);
    expect(result.x).toBe(70);
    expect(result.y).toBe(70);
  });

  it("returns closest point when multiple within threshold", () => {
    const result = findClosestSnapPoint(2, 2, snapPoints, 10);
    expect(result.snapped).toBe(true);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });
});

describe("getSnapPointForConnection", () => {
  it("returns point at index for rect", () => {
    const obj = {
      id: "r1",
      type: "rect" as const,
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    };
    const p = getSnapPointForConnection(obj, 1);
    expect(p).toEqual({ x: 110, y: 20 });
  });

  it("returns null for out-of-range index", () => {
    const obj = {
      id: "r1",
      type: "rect" as const,
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    };
    expect(getSnapPointForConnection(obj, 99)).toBeNull();
  });
});

describe("findClosestSnapPointWithConnection", () => {
  const rect = {
    id: "rect-1",
    type: "rect" as const,
    x: 50,
    y: 50,
    width: 100,
    height: 80,
  };

  it("returns connection when snapped to object", () => {
    const result = findClosestSnapPointWithConnection(
      55,
      55,
      [rect],
      "line-1",
      20
    );
    expect(result.snapped).toBe(true);
    expect(result.connection).toEqual({ objectId: "rect-1", pointIndex: 0 });
  });

  it("returns null connection when not snapped", () => {
    const result = findClosestSnapPointWithConnection(
      200,
      200,
      [rect],
      "line-1",
      20
    );
    expect(result.snapped).toBe(false);
    expect(result.connection).toBeNull();
  });

  it("excludes object by id", () => {
    const result = findClosestSnapPointWithConnection(
      55,
      55,
      [rect],
      "rect-1",
      20
    );
    expect(result.snapped).toBe(false);
  });
});
