"use client";

import type Konva from "konva";
import type { ObjectData } from "@/types";
import { StickyNote } from "./StickyNote";
import { RectShape } from "./RectShape";
import { CircleShape } from "./CircleShape";
import { LineShape } from "./LineShape";

export function ShapeRenderer({
  data,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
  stageScale,
}: {
  data: ObjectData;
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
  onShapeDragEnd?: () => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  stageScale?: number;
}) {
  const common = {
    data,
    onSelect,
    isSelected,
    isMultiSelect,
    registerShapeRef,
    onShapeDragEnd,
    onContextMenu,
  };
  switch (data.type) {
    case "sticky":
      return <StickyNote {...common} />;
    case "rect":
      return <RectShape {...common} />;
    case "circle":
      return <CircleShape {...common} />;
    case "line":
      return <LineShape {...common} stageScale={stageScale} />;
    default:
      return null;
  }
}
