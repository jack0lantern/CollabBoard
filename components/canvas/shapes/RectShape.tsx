"use client";

import { Rect } from "react-konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

export function RectShape({ data }: { data: ObjectData }) {
  const { updateObject } = useBoardMutations();
  const width = data.width ?? 100;
  const height = data.height ?? 80;

  return (
    <Rect
      x={data.x}
      y={data.y}
      width={width}
      height={height}
      fill={data.color ?? "#3b82f6"}
      draggable
      onDragEnd={(e) => {
        updateObject(data.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
    />
  );
}
