import type Konva from "konva";
import type { ObjectData } from "@/types";

/** Shape roots are Groups (Container); findOne is on Container. */
function asContainer(node: Konva.Node): Konva.Container | null {
  return "findOne" in node ? (node as Konva.Container) : null;
}

/**
 * Imperatively apply ObjectData to a Konva node (the Group root of a shape).
 * Used for undo/redo to update only changed shapes without React re-renders.
 */
export function applyObjectToKonvaNode(
  node: Konva.Node,
  obj: ObjectData
): void {
  node.x(obj.x);
  node.y(obj.y);
  node.rotation(obj.rotation ?? 0);

  const container = asContainer(node);
  if (!container) return;

  switch (obj.type) {
    case "rect":
    case "sticky":
    case "frame":
    case "text": {
      const rect = container.findOne("Rect") as Konva.Rect | undefined;
      if (rect) {
        const w = obj.width ?? 100;
        const h = obj.height ?? 80;
        rect.width(Math.max(1, w));
        rect.height(Math.max(1, h));
      }
      break;
    }
    case "circle": {
      const ellipse = container.findOne("Ellipse") as Konva.Ellipse | undefined;
      if (ellipse) {
        const rx = obj.radiusX ?? obj.radius ?? 50;
        const ry = obj.radiusY ?? obj.radius ?? 50;
        ellipse.radiusX(Math.max(1, rx));
        ellipse.radiusY(Math.max(1, ry));
      }
      break;
    }
    case "line": {
      const line = (container.findOne("Line") ?? container.findOne("Arrow")) as
        | Konva.Line
        | undefined;
      if (line && obj.points != null && obj.points.length >= 4) {
        line.points(obj.points);
      }
      break;
    }
    default:
      break;
  }
}
