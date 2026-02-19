"use client";

import { memo } from "react";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { StickyNote } from "./StickyNote";
import { RectShape } from "./RectShape";
import { CircleShape } from "./CircleShape";
import { LineShape } from "./LineShape";

export const ShapeRenderer = memo(function ShapeRenderer({
  data,
  otherObjects,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
  stageScale,
  onDragMoveTick,
  getLiveSnapPoints,
  dragMoveVersion,
}: {
  data: ObjectData;
  otherObjects?: ObjectData[];
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
  onShapeDragEnd?: () => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  stageScale?: number;
  onDragMoveTick?: () => void;
  getLiveSnapPoints?: (objectId: string) => { x: number; y: number }[] | null;
  dragMoveVersion?: number;
}) {
  const common = {
    data,
    onSelect,
    isSelected,
    isMultiSelect,
    registerShapeRef,
    onShapeDragEnd,
    onContextMenu,
    onDragMoveTick,
  };
  switch (data.type) {
    case "sticky":
      return <StickyNote {...common} />;
    case "rect":
      return <RectShape {...common} />;
    case "circle":
      return <CircleShape {...common} />;
    case "line":
      return (
        <LineShape
          {...common}
          otherObjects={otherObjects ?? []}
          stageScale={stageScale}
          getLiveSnapPoints={getLiveSnapPoints}
          dragMoveVersion={dragMoveVersion}
        />
      );
    default:
      return null;
  }
});
