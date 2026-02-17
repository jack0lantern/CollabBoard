"use client";

import { useEffect, useState } from "react";
import { Circle } from "react-konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

export function CircleShape({
  data,
  onSelect,
}: {
  data: ObjectData;
  onSelect: (id: string) => void;
}) {
  const { updateObject } = useBoardMutations();
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const radius = data.radius ?? 50;

  useEffect(() => {
    if (!isDragging) {
      setPos({ x: data.x, y: data.y });
    }
  }, [data.x, data.y, isDragging]);

  return (
    <Circle
      x={pos.x}
      y={pos.y}
      radius={radius}
      fill={data.color ?? "#10b981"}
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
