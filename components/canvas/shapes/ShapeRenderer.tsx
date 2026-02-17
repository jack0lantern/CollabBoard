"use client";

import type { ObjectData } from "@/types";
import { StickyNote } from "./StickyNote";
import { RectShape } from "./RectShape";
import { CircleShape } from "./CircleShape";
import { LineShape } from "./LineShape";

export function ShapeRenderer({
  data,
  onSelect,
  isSelected,
  onShapeDragEnd,
  onContextMenu,
}: {
  data: ObjectData;
  onSelect: (id: string) => void;
  isSelected?: boolean;
  onShapeDragEnd?: () => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
}) {
  const common = { data, onSelect, isSelected, onShapeDragEnd, onContextMenu };
  switch (data.type) {
    case "sticky":
      return <StickyNote {...common} />;
    case "rect":
      return <RectShape {...common} />;
    case "circle":
      return <CircleShape {...common} />;
    case "line":
      return <LineShape {...common} />;
    default:
      return null;
  }
}
