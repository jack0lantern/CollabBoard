"use client";

import { useEffect, useRef, useState } from "react";
import { Line } from "react-konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

export function LineShape({
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
  const { updateObject } = useBoardMutations();
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const points = data.points ?? [0, 0, 100, 100];
  const displayX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const displayY = isDragging ? pos.y : (localPos?.y ?? data.y);

  const prevPosRef = useRef({ x: data.x, y: data.y });
  useEffect(() => {
    if (localPos != null) {
      const prev = prevPosRef.current;
      if (data.x !== prev.x || data.y !== prev.y) {
        setLocalPos(null);
      }
    }
    prevPosRef.current = { x: data.x, y: data.y };
    if (!isDragging && localPos == null) {
      setPos({ x: data.x, y: data.y });
    }
  }, [data.x, data.y, isDragging, localPos]);

  return (
    <Line
      points={points}
      x={displayX}
      y={displayY}
      stroke={data.color ?? "#6b7280"}
      strokeWidth={2}
      dash={isSelected ? [8, 4] : undefined}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect(data.id);
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        onContextMenu?.(data.id, e.evt.clientX, e.evt.clientY);
      }}
      onDragStart={() => setIsDragging(true)}
      onDragMove={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
      onDragEnd={(e) => {
        const newX = e.target.x();
        const newY = e.target.y();
        setLocalPos({ x: newX, y: newY });
        setIsDragging(false);
        updateObject(data.id, { x: newX, y: newY });
        onShapeDragEnd?.();
      }}
    />
  );
}
