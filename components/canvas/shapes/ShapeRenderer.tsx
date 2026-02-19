"use client";

import { memo } from "react";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { StickyNote } from "./StickyNote";
import { RectShape } from "./RectShape";
import { CircleShape } from "./CircleShape";
import { LineShape } from "./LineShape";
import { FrameShape } from "./FrameShape";

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
  onDragEndAt,
  onDragMoveAt,
  onFrameDragWithContents,
  onFrameDragStart,
  onFrameDragEnd,
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
  onDragEndAt?: (objectId: string, newX: number, newY: number) => void;
  onDragMoveAt?: (objectId: string, newX: number, newY: number) => void;
  onFrameDragWithContents?: (
    frameId: string,
    prevX: number,
    prevY: number,
    deltaX: number,
    deltaY: number
  ) => void;
  onFrameDragStart?: (frameId: string, startX: number, startY: number) => void;
  onFrameDragEnd?: (frameId: string, newX: number, newY: number) => void;
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
    onDragEndAt,
    onDragMoveAt,
  };
  switch (data.type) {
    case "sticky":
      return <StickyNote {...common} />;
    case "rect":
      return <RectShape {...common} />;
    case "circle":
      return <CircleShape {...common} />;
    case "frame":
      return (
        <FrameShape
          {...common}
          onFrameDragWithContents={onFrameDragWithContents}
          onFrameDragStart={onFrameDragStart}
          onFrameDragEnd={onFrameDragEnd}
        />
      );
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
