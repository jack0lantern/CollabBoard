"use client";

import { useEffect, useState } from "react";
import { Line } from "react-konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

export function LineShape({
  data,
  onSelect,
}: {
  data: ObjectData;
  onSelect: (id: string) => void;
}) {
  const { updateObject } = useBoardMutations();
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const points = data.points ?? [0, 0, 100, 100];

  useEffect(() => {
    if (!isDragging) {
      setPos({ x: data.x, y: data.y });
    }
  }, [data.x, data.y, isDragging]);

  return (
    <Line
      points={points}
      x={pos.x}
      y={pos.y}
      stroke={data.color ?? "#6b7280"}
      strokeWidth={2}
      draggable
      onMouseDown={() => onSelect(data.id)}
      onDragStart={() => setIsDragging(true)}
      onDragMove={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
      onDragEnd={(e) => {
        setIsDragging(false);
        updateObject(data.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
    />
  );
}
