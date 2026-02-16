"use client";

import { Circle } from "react-konva";
import type { ObjectData } from "@/types";
import { useUpdateObject } from "@/lib/liveblocks/hooks";

export function CircleShape({ data }: { data: ObjectData }) {
  const updateObject = useUpdateObject();
  const radius = data.radius ?? 50;

  return (
    <Circle
      x={data.x}
      y={data.y}
      radius={radius}
      fill={data.color ?? "#10b981"}
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
