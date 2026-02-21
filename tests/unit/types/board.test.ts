import { describe, it, expect } from "vitest";
import type { ObjectData, ShapeType, Board } from "@/types";

describe("ObjectData type", () => {
  it("validates sticky note shape structure", () => {
    const sticky: ObjectData = {
      id: "sticky-1",
      type: "sticky",
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      color: "#fef08a",
      text: "Hello",
    };
    expect(sticky.type).toBe("sticky");
    expect(sticky.text).toBe("Hello");
  });

  it("validates rect shape structure", () => {
    const rect: ObjectData = {
      id: "rect-1",
      type: "rect",
      x: 50,
      y: 50,
      width: 100,
      height: 80,
      color: "#3b82f6",
    };
    expect(rect.type).toBe("rect");
  });

  it("validates circle shape structure", () => {
    const circle: ObjectData = {
      id: "circle-1",
      type: "circle",
      x: 100,
      y: 100,
      radius: 50,
      color: "#10b981",
    };
    expect(circle.type).toBe("circle");
  });

  it("validates line shape structure", () => {
    const line: ObjectData = {
      id: "line-1",
      type: "line",
      x: 0,
      y: 0,
      points: [0, 0, 100, 100],
      color: "#6b7280",
    };
    expect(line.type).toBe("line");
  });

  it("validates frame shape structure", () => {
    const frame: ObjectData = {
      id: "frame-1",
      type: "frame",
      x: 100,
      y: 100,
      width: 600,
      height: 400,
      frameColor: "#ffffff",
      strokeColor: "#e5e7eb",
      strokeWidth: 1,
      title: "My Frame",
    };
    expect(frame.type).toBe("frame");
    expect(frame.title).toBe("My Frame");
  });

  it("validates text shape structure", () => {
    const text: ObjectData = {
      id: "text-1",
      type: "text",
      x: 100,
      y: 100,
      width: 200,
      height: 32,
      text: "Standalone text",
      fontSize: 16,
      fontFamily: "sans-serif",
      textColor: "#000000",
    };
    expect(text.type).toBe("text");
    expect(text.text).toBe("Standalone text");
  });

  it("validates pen shape structure", () => {
    const pen: ObjectData = {
      id: "pen-1",
      type: "pen",
      x: 50,
      y: 50,
      points: [0, 0, 10, 20, 30, 15],
      strokeColor: "#1a1a2e",
      strokeWidth: 2,
    };
    expect(pen.type).toBe("pen");
    expect(pen.points).toHaveLength(6);
  });

  it("accepts all valid ShapeType values", () => {
    const types: ShapeType[] = ["sticky", "rect", "circle", "diamond", "triangle", "line", "frame", "text", "pen"];
    types.forEach((type) => {
      const obj: ObjectData = { id: "id", type, x: 0, y: 0 };
      expect(obj.type).toBe(type);
    });
  });
});

describe("Board type", () => {
  it("validates board structure with snapshot", () => {
    const board: Board = {
      id: "board-1",
      title: "Test Board",
      created_at: "2024-01-01T00:00:00Z",
      owner_id: "user-1",
      last_snapshot: {
        "obj-1": {
          id: "obj-1",
          type: "sticky",
          x: 0,
          y: 0,
          text: "Note",
        },
      },
    };
    expect(board.last_snapshot?.["obj-1"].text).toBe("Note");
  });
});
