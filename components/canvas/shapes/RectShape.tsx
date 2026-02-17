"use client";

import { useEffect, useState } from "react";
import { Rect } from "react-konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

export function RectShape({
  data,
  onSelect,
}: {
  data: ObjectData;
  onSelect: (id: string) => void;
}) {
  const { updateObject } = useBoardMutations();
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const width = data.width ?? 100;
  const height = data.height ?? 80;

  useEffect(() => {
    if (!isDragging) {
      setPos({ x: data.x, y: data.y });
    }
  }, [data.x, data.y, isDragging]);

  return (
    <Rect
      x={pos.x}
      y={pos.y}
      width={width}
      height={height}
      fill={data.color ?? "#3b82f6"}
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
