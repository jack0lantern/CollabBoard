"use client";

import { Line } from "react-konva";
import type { ObjectData } from "@/types";
import { useUpdateObject } from "@/lib/liveblocks/hooks";

export function LineShape({ data }: { data: ObjectData }) {
  const updateObject = useUpdateObject();
  const points = data.points ?? [0, 0, 100, 100];

  return (
    <Line
      points={points}
      x={data.x}
      y={data.y}
      stroke={data.color ?? "#6b7280"}
      strokeWidth={2}
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
