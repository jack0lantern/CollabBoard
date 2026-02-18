import { describe, it, expect } from "vitest";
import type { ObjectData } from "@/types";
import {
  getObjectBoundingBox,
  computeGroupBoundingBox,
  isFullyContained,
} from "@/lib/utils/boundingBox";
import { computeTransformedObject } from "@/lib/utils/transformMultiSelect";

describe("multi-select transform", () => {
  describe("1. Individual items in selection stretching properly and flickering", () => {
    it("rect stretches by scale factors without reverting", () => {
      const rect: ObjectData = {
        id: "r1",
        type: "rect",
        x: 100,
        y: 100,
        width: 80,
        height: 60,
      };
      const updated = computeTransformedObject(rect, {
        x: 100,
        y: 100,
        scaleX: 2,
        scaleY: 1.5,
      });
      expect(updated.width).toBe(160);
      expect(updated.height).toBe(90);
    });

    it("circle stretches to ellipse by scale factors", () => {
      const circle: ObjectData = {
        id: "c1",
        type: "circle",
        x: 200,
        y: 200,
        radius: 40,
      };
      const updated = computeTransformedObject(circle, {
        x: 200,
        y: 200,
        scaleX: 2,
        scaleY: 1.5,
      });
      expect(updated.radiusX).toBe(80);
      expect(updated.radiusY).toBe(60);
    });

    it("sticky stretches by scale factors", () => {
      const sticky: ObjectData = {
        id: "s1",
        type: "sticky",
        x: 50,
        y: 50,
        width: 200,
        height: 150,
      };
      const updated = computeTransformedObject(sticky, {
        x: 50,
        y: 50,
        scaleX: 0.5,
        scaleY: 2,
      });
      expect(updated.width).toBe(100);
      expect(updated.height).toBe(300);
    });

    it("line points scale by scale factors", () => {
      const line: ObjectData = {
        id: "l1",
        type: "line",
        x: 0,
        y: 0,
        points: [0, 0, 100, 80],
      };
      const updated = computeTransformedObject(line, {
        x: 0,
        y: 0,
        scaleX: 2,
        scaleY: 1.5,
      });
      expect(updated.points).toEqual([0, 0, 200, 120]);
    });

    it("rotation is included in output for rect, circle, line when group is rotated", () => {
      const rect: ObjectData = {
        id: "r1",
        type: "rect",
        x: 100,
        y: 100,
        width: 80,
        height: 60,
      };
      const circle: ObjectData = {
        id: "c1",
        type: "circle",
        x: 200,
        y: 200,
        radius: 40,
      };
      const line: ObjectData = {
        id: "l1",
        type: "line",
        x: 0,
        y: 0,
        points: [0, 0, 100, 80],
      };
      const rotation = 45;
      expect(computeTransformedObject(rect, { x: 100, y: 100, scaleX: 1, scaleY: 1, rotation }).rotation).toBe(45);
      expect(computeTransformedObject(circle, { x: 200, y: 200, scaleX: 1, scaleY: 1, rotation }).rotation).toBe(45);
      expect(computeTransformedObject(line, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation }).rotation).toBe(45);
    });

    it("identity transform does not cause dimension flicker", () => {
      const rect: ObjectData = {
        id: "r1",
        type: "rect",
        x: 100,
        y: 100,
        width: 80,
        height: 60,
      };
      const updated = computeTransformedObject(rect, {
        x: 100,
        y: 100,
        scaleX: 1,
        scaleY: 1,
      });
      expect(updated.width).toBe(80);
      expect(updated.height).toBe(60);
    });
  });

  describe("2. Overall bounding box stretching proportionally and flickering", () => {
    it("ellipse bounding box uses radiusX and radiusY separately", () => {
      const ellipse: ObjectData = {
        id: "e1",
        type: "circle",
        x: 100,
        y: 100,
        radiusX: 30,
        radiusY: 50,
      };
      const box = getObjectBoundingBox(ellipse);
      expect(box.width).toBe(60);
      expect(box.height).toBe(100);
    });

    it("group bounding box scales proportionally after transform", () => {
      const scaleX = 2;
      const scaleY = 1.5;
      const rect: ObjectData = {
        id: "r1",
        type: "rect",
        x: 0,
        y: 0,
        width: 100,
        height: 80,
      };
      const circle: ObjectData = {
        id: "c1",
        type: "circle",
        x: 150,
        y: 100,
        radiusX: 25,
        radiusY: 40,
      };
      const before = computeGroupBoundingBox([rect, circle]);
      const rectAfter = {
        ...rect,
        ...computeTransformedObject(rect, {
          x: rect.x * scaleX,
          y: rect.y * scaleY,
          scaleX,
          scaleY,
        }),
      };
      const circleAfter = {
        ...circle,
        ...computeTransformedObject(circle, {
          x: circle.x * scaleX,
          y: circle.y * scaleY,
          scaleX,
          scaleY,
        }),
      };
      const after = computeGroupBoundingBox([rectAfter, circleAfter]);
      expect(after.width).toBeCloseTo(before.width * scaleX, 0);
      expect(after.height).toBeCloseTo(before.height * scaleY, 0);
    });

    it("identity transform does not change group bounding box", () => {
      const objects: ObjectData[] = [
        {
          id: "r1",
          type: "rect",
          x: 10,
          y: 10,
          width: 50,
          height: 40,
        },
        {
          id: "c1",
          type: "circle",
          x: 80,
          y: 60,
          radius: 20,
        },
      ];
      const before = computeGroupBoundingBox(objects);
      const transformed = objects.map((obj) => ({
        ...obj,
        ...computeTransformedObject(obj, {
          x: obj.x,
          y: obj.y,
          scaleX: 1,
          scaleY: 1,
        }),
      }));
      const after = computeGroupBoundingBox(transformed);
      expect(after.width).toBe(before.width);
      expect(after.height).toBe(before.height);
    });
  });

  describe("3. All selected items stay within the bounding box", () => {
    it("each item bounding box is fully contained in group bounding box", () => {
      const objects: ObjectData[] = [
        {
          id: "r1",
          type: "rect",
          x: 20,
          y: 20,
          width: 60,
          height: 50,
        },
        {
          id: "c1",
          type: "circle",
          x: 120,
          y: 80,
          radiusX: 25,
          radiusY: 35,
        },
        {
          id: "s1",
          type: "sticky",
          x: 200,
          y: 10,
          width: 100,
          height: 80,
        },
      ];
      const groupBox = computeGroupBoundingBox(objects);
      for (const obj of objects) {
        const itemBox = getObjectBoundingBox(obj);
        expect(
          isFullyContained(itemBox, groupBox),
          `${obj.type} ${obj.id} should be contained in group box`
        ).toBe(true);
      }
    });

    it("transformed items stay within scaled group bounding box", () => {
      const scaleX = 1.5;
      const scaleY = 2;
      const objects: ObjectData[] = [
        {
          id: "r1",
          type: "rect",
          x: 0,
          y: 0,
          width: 100,
          height: 80,
        },
        {
          id: "c1",
          type: "circle",
          x: 120,
          y: 60,
          radiusX: 30,
          radiusY: 40,
        },
      ];
      const transformed = objects.map((obj) => ({
        ...obj,
        ...computeTransformedObject(obj, {
          x: obj.x * scaleX,
          y: obj.y * scaleY,
          scaleX,
          scaleY,
        }),
      }));
      const groupBox = computeGroupBoundingBox(transformed);
      for (const obj of transformed) {
        const itemBox = getObjectBoundingBox(obj);
        expect(
          isFullyContained(itemBox, groupBox),
          `${obj.type} ${obj.id} should be contained after transform`
        ).toBe(true);
      }
    });
  });
});
